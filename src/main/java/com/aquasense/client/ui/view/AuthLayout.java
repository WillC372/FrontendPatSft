package com.aquasense.client.ui.view;

import com.aquasense.client.ui.Ui;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.shape.SVGPath;

final class AuthLayout {

    private AuthLayout() {
    }

    static Node wrap(Node form) {
        SVGPath drop = new SVGPath();
        drop.setContent("M32 4 C32 4 12 28 12 42 a20 20 0 0 0 40 0 C52 28 32 4 32 4 Z");
        drop.getStyleClass().add("brand-icon");
        drop.setScaleX(1.5);
        drop.setScaleY(1.5);
        StackPane iconBox = new StackPane(drop);
        iconBox.setMinHeight(110);

        VBox brand = new VBox(10, iconBox, Ui.label("AquaSense AI", "brand-title"),
                Ui.label("Monitorea · Analiza · Cuida", "brand-subtitle"),
                Ui.wrapped("Monitoreo inteligente del pH del agua para agua potable, piscinas, acuarios y riego.",
                        "brand-subtitle"));
        brand.setAlignment(Pos.CENTER);
        brand.setPadding(new Insets(40));
        brand.getStyleClass().add("brand-panel");
        brand.setPrefWidth(400);
        brand.setMinWidth(300);

        StackPane formHost = new StackPane(form);
        formHost.setPadding(new Insets(30));
        formHost.setAlignment(Pos.CENTER);
        ScrollPane scroll = new ScrollPane(formHost);
        scroll.setFitToWidth(true);
        scroll.setFitToHeight(true);
        HBox.setHgrow(scroll, Priority.ALWAYS);

        HBox root = new HBox(brand, scroll);
        return root;
    }

    static VBox formCard(double width, Node... content) {
        VBox box = new VBox(12, content);
        box.getStyleClass().add("card");
        box.setMaxWidth(width);
        box.setMaxHeight(javafx.scene.layout.Region.USE_PREF_SIZE);
        box.setPadding(new Insets(28));
        return box;
    }
}
