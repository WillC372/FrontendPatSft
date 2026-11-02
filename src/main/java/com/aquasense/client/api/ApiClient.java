package com.aquasense.client.api;

import com.aquasense.client.api.ApiModels.RefreshRequest;
import com.aquasense.client.api.ApiModels.TokenDto;
import com.aquasense.client.session.Session;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.function.Consumer;

public class ApiClient {

    private static final String AUTH_PREFIX = "/api/v1/auth/";

    private final String baseUrl;
    private final Session session;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private volatile Consumer<TokenDto> onTokensRefreshed = tokens -> { };
    private volatile Runnable onSessionExpired = () -> { };

    public ApiClient(String baseUrl, Session session) {
        this.baseUrl = baseUrl;
        this.session = session;
    }

    public void setOnTokensRefreshed(Consumer<TokenDto> callback) {
        this.onTokensRefreshed = callback;
    }

    public void setOnSessionExpired(Runnable callback) {
        this.onSessionExpired = callback;
    }

    public <T> T get(String path, Class<T> type) {
        return send("GET", path, null, type);
    }

    public <T> T post(String path, Object body, Class<T> type) {
        return send("POST", path, body, type);
    }

    public <T> T put(String path, Object body, Class<T> type) {
        return send("PUT", path, body, type);
    }

    public void delete(String path) {
        send("DELETE", path, null, Void.class);
    }

    public <T> T get(String path, com.fasterxml.jackson.core.type.TypeReference<T> type) {
        JsonNode node = send("GET", path, null, JsonNode.class);
        return mapper.convertValue(node, type);
    }

    private <T> T send(String method, String path, Object body, Class<T> type) {
        HttpResponse<String> response = execute(method, path, body);
        if (response.statusCode() == 401 && !path.startsWith(AUTH_PREFIX) && tryRefresh()) {
            response = execute(method, path, body);
        }
        if (response.statusCode() == 401 && !path.startsWith(AUTH_PREFIX)) {
            onSessionExpired.run();
        }
        return parse(response, type);
    }

    private synchronized boolean tryRefresh() {
        String refresh = session.refreshToken();
        if (refresh == null) {
            return false;
        }
        HttpResponse<String> response = execute("POST", AUTH_PREFIX + "refresh", new RefreshRequest(refresh));
        if (response.statusCode() != 200) {
            return false;
        }
        TokenDto tokens = parse(response, TokenDto.class);
        session.start(tokens, session.remember());
        onTokensRefreshed.accept(tokens);
        return true;
    }

    private HttpResponse<String> execute(String method, String path, Object body) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + path))
                    .timeout(Duration.ofSeconds(20))
                    .header("Accept", "application/json");
            String token = session.accessToken();
            if (token != null && !path.startsWith(AUTH_PREFIX)) {
                builder.header("Authorization", "Bearer " + token);
            }
            if (body != null) {
                builder.header("Content-Type", "application/json");
                builder.method(method, HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            } else {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            }
            return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        } catch (java.net.ConnectException | java.net.http.HttpTimeoutException e) {
            throw new ApiException(0, "SERVER_UNREACHABLE",
                    "No se pudo conectar con el servidor de AquaSense. Verifique su conexión.");
        } catch (IOException e) {
            throw new ApiException(0, "NETWORK_ERROR", "Error de comunicación con el servidor.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(0, "INTERRUPTED", "La operación fue interrumpida.");
        }
    }

    private <T> T parse(HttpResponse<String> response, Class<T> type) {
        int status = response.statusCode();
        String body = response.body();
        if (status >= 200 && status < 300) {
            if (type == Void.class || body == null || body.isBlank()) {
                return null;
            }
            try {
                return mapper.readValue(body, type);
            } catch (IOException e) {
                throw new ApiException(status, "BAD_RESPONSE", "Respuesta inesperada del servidor.");
            }
        }
        String code = "HTTP_" + status;
        String message = "El servidor respondió con un error (" + status + ").";
        try {
            JsonNode node = mapper.readTree(body);
            if (node.hasNonNull("code")) {
                code = node.get("code").asText();
            }
            if (node.hasNonNull("message")) {
                message = node.get("message").asText();
            }
            if (node.has("details") && node.get("details").isArray() && !node.get("details").isEmpty()) {
                StringBuilder sb = new StringBuilder(message);
                node.get("details").forEach(d -> sb.append("\n• ").append(d.asText()));
                message = sb.toString();
            }
        } catch (IOException | NullPointerException ignored) {
            // keep generic message
        }
        throw new ApiException(status, code, message);
    }
}
