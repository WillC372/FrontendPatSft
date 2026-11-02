package com.aquasense.client.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aquasense.client.api.ApiModels.TokenDto;
import com.aquasense.client.api.ApiModels.UserDto;
import com.aquasense.client.api.StubApiServer.Reply;
import com.aquasense.client.session.Session;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ApiClientTest {

    private StubApiServer server;
    private Session session;
    private ApiClient client;

    private static final String TOKENS = """
            {"accessToken":"new-access","refreshToken":"new-refresh","tokenType":"Bearer","expiresInSeconds":900,
             "user":{"id":"1","email":"a@b.co","displayName":"Ana","roles":["USER"]}}""";

    @BeforeEach
    void setUp() throws Exception {
        server = new StubApiServer();
        session = new Session();
        client = new ApiClient(server.baseUrl(), session);
    }

    @AfterEach
    void tearDown() {
        server.close();
    }

    private void startSession(String access, String refresh) {
        session.start(new TokenDto(access, refresh, "Bearer", 900,
                new UserDto("1", "a@b.co", null, "Ana", List.of("USER"))), true);
    }

    @Test
    void sendsBearerTokenOnProtectedCallsButNotOnAuthCalls() {
        startSession("tok", "ref");
        server.respondWith(c -> new Reply(200, "{\"message\":\"ok\"}"));
        client.get("/api/v1/profiles/x", ApiModels.MessageDto.class);
        client.post("/api/v1/auth/forgot-password", new ApiModels.ForgotPasswordRequest("a@b.co"),
                ApiModels.MessageDto.class);
        assertThat(server.calls().get(0).authorization()).isEqualTo("Bearer tok");
        assertThat(server.calls().get(1).authorization()).isNull();
    }

    @Test
    void mapsServerErrorsToApiExceptionWithSpanishMessageAndDetails() {
        server.respondWith(c -> new Reply(400,
                "{\"code\":\"VALIDATION_ERROR\",\"message\":\"Los datos enviados no son válidos.\","
                        + "\"details\":[\"email: inválido\"]}"));
        assertThatThrownBy(() -> client.post("/api/v1/auth/register", new ApiModels.ForgotPasswordRequest("x"),
                ApiModels.MessageDto.class))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(400);
                    assertThat(e.getCode()).isEqualTo("VALIDATION_ERROR");
                    assertThat(e.getMessage()).contains("no son válidos").contains("email: inválido");
                });
    }

    @Test
    void refreshesTokenOnceOnUnauthorizedAndRetries() {
        startSession("expired", "ref-1");
        server.respondWith(c -> {
            if (c.path().equals("/api/v1/auth/refresh")) {
                return new Reply(200, TOKENS);
            }
            return "Bearer new-access".equals(c.authorization()) ? new Reply(200, "{\"message\":\"ok\"}")
                    : new Reply(401, "{\"code\":\"UNAUTHORIZED\",\"message\":\"x\"}");
        });
        ApiModels.MessageDto result = client.get("/api/v1/profiles", ApiModels.MessageDto.class);
        assertThat(result.message()).isEqualTo("ok");
        assertThat(session.accessToken()).isEqualTo("new-access");
        assertThat(session.refreshToken()).isEqualTo("new-refresh");
        assertThat(server.calls()).hasSize(3);
    }

    @Test
    void notifiesSessionExpiredWhenRefreshFails() {
        startSession("expired", "ref-1");
        AtomicBoolean expired = new AtomicBoolean();
        client.setOnSessionExpired(() -> expired.set(true));
        server.respondWith(c -> new Reply(401, "{\"code\":\"INVALID_SESSION\",\"message\":\"x\"}"));
        assertThatThrownBy(() -> client.get("/api/v1/profiles", ApiModels.MessageDto.class))
                .isInstanceOf(ApiException.class);
        assertThat(expired).isTrue();
    }

    @Test
    void reportsUnreachableServerClearly() throws Exception {
        String url = server.baseUrl();
        server.close();
        ApiClient offline = new ApiClient(url, new Session());
        assertThatThrownBy(() -> offline.get("/api/v1/profiles", ApiModels.MessageDto.class))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getCode()).isEqualTo("SERVER_UNREACHABLE");
                    assertThat(e.getMessage()).contains("No se pudo conectar");
                });
        server = new StubApiServer();
    }

    @Test
    void returnsNullOnNoContent() {
        startSession("tok", "ref");
        server.respondWith(c -> new Reply(204, ""));
        assertThat(client.get("/api/v1/measurements/latest", ApiModels.MeasurementDto.class)).isNull();
    }
}
