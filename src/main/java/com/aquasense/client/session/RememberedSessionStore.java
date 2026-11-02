package com.aquasense.client.session;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Optional;

public class RememberedSessionStore {

    private final Path file;

    public RememberedSessionStore(Path directory) {
        this.file = directory.resolve("session.token");
    }

    public void save(String refreshToken) {
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, refreshToken);
            try {
                Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
            } catch (UnsupportedOperationException ignored) {
                file.toFile().setReadable(false, false);
                file.toFile().setReadable(true, true);
            }
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar la sesión local.", e);
        }
    }

    public Optional<String> load() {
        try {
            if (!Files.exists(file)) {
                return Optional.empty();
            }
            String value = Files.readString(file).trim();
            return value.isEmpty() ? Optional.empty() : Optional.of(value);
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    public void clear() {
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // nothing else to do: a stale token is revoked server-side on logout
        }
    }
}
