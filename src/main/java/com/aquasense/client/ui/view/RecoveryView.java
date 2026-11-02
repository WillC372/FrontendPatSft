package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Navigator;
import com.aquasense.client.ui.Ui;
import com.aquasense.client.ui.component.PasswordInput;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;

public class RecoveryView {

    private final AppContext ctx;
    private final Navigator nav;

    public RecoveryView(AppContext ctx, Navigator nav) {
        this.ctx = ctx;
        this.nav = nav;
    }

    public Node build() {
        TextField email = FormSupport.text("correo@ejemplo.com");
        Button send = Ui.button("Enviar código", "btn-primary");
        TextField code = FormSupport.text("Código recibido por correo");
        PasswordInput password = new PasswordInput("Nueva contraseña");
        PasswordInput confirm = new PasswordInput("Repite la nueva contraseña");
        Button reset = Ui.button("Restablecer contraseña", "btn-primary");
        Button back = Ui.button("Volver a iniciar sesión", "btn-link");
        Label error = FormSupport.errorBox();
        Label info = FormSupport.infoBox();

        send.setOnAction(e -> {
            FormSupport.show(error, null);
            if (!FormSupport.EMAIL.matcher(email.getText().trim()).matches()) {
                FormSupport.show(error, "Ingrese un correo electrónico válido.");
                return;
            }
            send.setDisable(true);
            Async.run(() -> ctx.auth().requestPasswordReset(email.getText()),
                    message -> {
                        send.setDisable(false);
                        FormSupport.show(info, message);
                    },
                    t -> {
                        send.setDisable(false);
                        FormSupport.show(error, t.getMessage());
                    });
        });
        reset.setOnAction(e -> {
            FormSupport.show(error, null);
            if (code.getText().isBlank()) {
                FormSupport.show(error, "Ingrese el código que recibió por correo.");
                return;
            }
            if (!FormSupport.PASSWORD.matcher(password.getText()).matches()) {
                FormSupport.show(error, FormSupport.PASSWORD_HELP);
                return;
            }
            if (!password.getText().equals(confirm.getText())) {
                FormSupport.show(error, "Las contraseñas no coinciden.");
                return;
            }
            reset.setDisable(true);
            Async.run(() -> ctx.auth().resetPassword(code.getText(), password.getText(), confirm.getText()),
                    message -> nav.show(new LoginView(ctx, nav, message).build()),
                    t -> {
                        reset.setDisable(false);
                        FormSupport.show(error, t.getMessage());
                    });
        });
        back.setOnAction(e -> nav.show(new LoginView(ctx, nav, null).build()));

        VBox card = AuthLayout.formCard(440,
                Ui.label("Recuperar contraseña", "h1"),
                Ui.wrapped("Le enviaremos un código por correo electrónico. Es válido por 30 minutos y solo puede usarse una vez.", "muted"),
                info, error,
                Ui.label("1. Solicitar código", "h3"),
                FormSupport.field("Correo electrónico", email), send,
                Ui.label("2. Restablecer", "h3"),
                FormSupport.field("Código", code),
                FormSupport.field("Nueva contraseña", password),
                FormSupport.field("Confirmar contraseña", confirm),
                reset, back);
        return AuthLayout.wrap(card);
    }
}
