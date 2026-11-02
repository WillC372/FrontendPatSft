package com.aquasense.client.ui.view;

import com.aquasense.client.ui.Ui;
import java.util.regex.Pattern;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;

final class FormSupport {

    static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    static final Pattern PASSWORD = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,72}$");
    static final String PASSWORD_HELP = "La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.";

    private FormSupport() {
    }

    static VBox field(String label, javafx.scene.Node input) {
        return new VBox(4, Ui.label(label, "small", "muted"), input);
    }

    static TextField text(String prompt) {
        TextField field = new TextField();
        field.setPromptText(prompt);
        return field;
    }

    static Label errorBox() {
        Label label = Ui.wrapped("", "error-box", "error-text");
        label.setVisible(false);
        label.setManaged(false);
        label.setMaxWidth(Double.MAX_VALUE);
        return label;
    }

    static Label infoBox() {
        Label label = Ui.wrapped("", "info-box", "info-text");
        label.setVisible(false);
        label.setManaged(false);
        label.setMaxWidth(Double.MAX_VALUE);
        return label;
    }

    static void show(Label box, String message) {
        box.setText(message);
        boolean present = message != null && !message.isBlank();
        box.setVisible(present);
        box.setManaged(present);
    }
}
