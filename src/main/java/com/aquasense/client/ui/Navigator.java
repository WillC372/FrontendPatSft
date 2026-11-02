package com.aquasense.client.ui;

import javafx.animation.FadeTransition;
import javafx.scene.Node;
import javafx.scene.layout.StackPane;
import javafx.util.Duration;

public class Navigator {

    private final StackPane host = new StackPane();

    public StackPane root() {
        return host;
    }

    public void show(Node view) {
        view.setOpacity(0);
        host.getChildren().setAll(view);
        FadeTransition fade = new FadeTransition(Duration.millis(220), view);
        fade.setToValue(1);
        fade.play();
    }
}
