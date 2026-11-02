package com.aquasense.client.ui;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;

public final class Ui {

    private Ui() {
    }

    public static Label label(String text, String... styleClasses) {
        Label label = new Label(text);
        label.getStyleClass().addAll(styleClasses);
        return label;
    }

    public static Label wrapped(String text, String... styleClasses) {
        Label label = label(text, styleClasses);
        label.setWrapText(true);
        return label;
    }

    public static Button button(String text, String styleClass) {
        Button button = new Button(text);
        button.getStyleClass().add(styleClass);
        button.setMinWidth(Region.USE_PREF_SIZE);
        return button;
    }

    public static VBox card(String title, Node... content) {
        VBox box = new VBox(10);
        box.getStyleClass().add("card");
        if (title != null) {
            box.getChildren().add(label(title.toUpperCase(), "card-title"));
        }
        box.getChildren().addAll(content);
        return box;
    }

    public static Region spacer() {
        Region region = new Region();
        HBox.setHgrow(region, Priority.ALWAYS);
        VBox.setVgrow(region, Priority.ALWAYS);
        return region;
    }

    public static HBox row(double spacing, Node... nodes) {
        HBox box = new HBox(spacing, nodes);
        box.setAlignment(Pos.CENTER_LEFT);
        return box;
    }

    public static VBox column(double spacing, Node... nodes) {
        VBox box = new VBox(spacing, nodes);
        box.setPadding(Insets.EMPTY);
        return box;
    }

    public static Label chip(String text, String variant) {
        return label(text, "chip", "chip-" + variant);
    }
}
