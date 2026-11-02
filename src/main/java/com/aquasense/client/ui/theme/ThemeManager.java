package com.aquasense.client.ui.theme;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import javafx.scene.Scene;

public class ThemeManager {

    public enum Theme { LIGHT, DARK }

    private final Path file;
    private Theme current;
    private Scene scene;

    public ThemeManager(Path directory) {
        this.file = directory.resolve("preferences.properties");
        this.current = load();
    }

    public void attach(Scene scene) {
        this.scene = scene;
        apply();
    }

    public Theme current() {
        return current;
    }

    public void toggle() {
        current = current == Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
        save();
        apply();
    }

    private void apply() {
        if (scene == null) {
            return;
        }
        scene.getStylesheets().setAll(
                getClass().getResource("/css/base.css").toExternalForm(),
                getClass().getResource(current == Theme.LIGHT ? "/css/light.css" : "/css/dark.css").toExternalForm());
    }

    private Theme load() {
        Properties props = new Properties();
        if (Files.exists(file)) {
            try (InputStream in = Files.newInputStream(file)) {
                props.load(in);
            } catch (IOException ignored) {
                return Theme.LIGHT;
            }
        }
        return "DARK".equals(props.getProperty("theme")) ? Theme.DARK : Theme.LIGHT;
    }

    private void save() {
        Properties props = new Properties();
        props.setProperty("theme", current.name());
        try {
            Files.createDirectories(file.getParent());
            try (OutputStream out = Files.newOutputStream(file)) {
                props.store(out, "AquaSense AI preferences");
            }
        } catch (IOException ignored) {
            // the preference simply will not persist
        }
    }
}
