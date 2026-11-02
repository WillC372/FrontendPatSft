package com.aquasense.client.session;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class RememberedSessionStoreTest {

    @TempDir
    Path dir;

    @Test
    void savesLoadsAndClearsWithOwnerOnlyPermissions() throws Exception {
        RememberedSessionStore store = new RememberedSessionStore(dir);
        assertThat(store.load()).isEmpty();
        store.save("refresh-abc");
        assertThat(store.load()).contains("refresh-abc");
        if (Files.getFileStore(dir).supportsFileAttributeView("posix")) {
            assertThat(PosixFilePermissions.toString(Files.getPosixFilePermissions(dir.resolve("session.token"))))
                    .isEqualTo("rw-------");
        }
        store.clear();
        assertThat(store.load()).isEmpty();
    }
}
