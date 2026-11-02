package com.aquasense.client.config;

import java.nio.file.Path;

public final class AppConfig {

    private static final String DEFAULT_API_URL = "http://localhost:8080";

    private AppConfig() {
    }

    public static String apiBaseUrl() {
        String fromProperty = System.getProperty("aquasense.api.url");
        String fromEnv = System.getenv("AQUASENSE_API_URL");
        String value = fromProperty != null ? fromProperty : fromEnv != null ? fromEnv : DEFAULT_API_URL;
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public static Path dataDirectory() {
        String override = System.getProperty("aquasense.data.dir");
        return override != null ? Path.of(override) : Path.of(System.getProperty("user.home"), ".aquasense");
    }
}
