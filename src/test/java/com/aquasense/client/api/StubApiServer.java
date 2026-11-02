package com.aquasense.client.api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/** TEST DOUBLE: local HTTP stub used only by automated tests. It is not a real AquaSense server. */
public class StubApiServer implements AutoCloseable {

    public record Reply(int status, String body) {
    }

    public record Call(String method, String path, String authorization, String body) {
    }

    private final HttpServer server;
    private final List<Call> calls = new ArrayList<>();
    private Function<Call, Reply> handler = call -> new Reply(404, "{}");

    public StubApiServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    public void respondWith(Function<Call, Reply> handler) {
        this.handler = handler;
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public synchronized List<Call> calls() {
        return List.copyOf(calls);
    }

    private void handle(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Call call = new Call(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                exchange.getRequestHeaders().getFirst("Authorization"), body);
        synchronized (this) {
            calls.add(call);
        }
        Reply reply = handler.apply(call);
        byte[] bytes = reply.body().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        if (bytes.length == 0) {
            exchange.sendResponseHeaders(reply.status(), -1);
        } else {
            exchange.sendResponseHeaders(reply.status(), bytes.length);
            exchange.getResponseBody().write(bytes);
        }
        exchange.close();
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
