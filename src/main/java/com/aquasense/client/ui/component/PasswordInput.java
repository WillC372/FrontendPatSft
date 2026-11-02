package com.aquasense.client.ui.component;

import com.aquasense.client.ui.Ui;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.StackPane;

public class PasswordInput extends HBox {

    private final PasswordField hidden = new PasswordField();
    private final TextField visible = new TextField();
    private final Button toggle = Ui.button("Mostrar", "btn-link");

    public PasswordInput(String prompt) {
        hidden.setPromptText(prompt);
        visible.setPromptText(prompt);
        visible.textProperty().bindBidirectional(hidden.textProperty());
        visible.setManaged(false);
        visible.setVisible(false);
        StackPane stack = new StackPane(hidden, visible);
        HBox.setHgrow(stack, Priority.ALWAYS);
        toggle.setFocusTraversable(false);
        toggle.setOnAction(e -> {
            boolean show = !visible.isVisible();
            visible.setVisible(show);
            visible.setManaged(show);
            hidden.setVisible(!show);
            hidden.setManaged(!show);
            toggle.setText(show ? "Ocultar" : "Mostrar");
        });
        setAlignment(Pos.CENTER_LEFT);
        setSpacing(6);
        getChildren().addAll(stack, toggle);
    }

    public String getText() {
        return hidden.getText();
    }

    public void clear() {
        hidden.clear();
    }

    public void onEnter(Runnable action) {
        hidden.setOnAction(e -> action.run());
        visible.setOnAction(e -> action.run());
    }
}
