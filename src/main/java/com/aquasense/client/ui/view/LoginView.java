package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Navigator;
import com.aquasense.client.ui.Ui;
import com.aquasense.client.ui.component.PasswordInput;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;

public class LoginView {

    private final AppContext ctx;
    private final Navigator nav;
    private final String notice;

    public LoginView(AppContext ctx, Navigator nav, String notice) {
        this.ctx = ctx;
        this.nav = nav;
        this.notice = notice;
    }

    public Node build() {
        TextField identifier = FormSupport.text("correo@ejemplo.com o usuario");
        PasswordInput password = new PasswordInput("Contraseña");
        CheckBox remember = new CheckBox("Recordarme");
        Button forgot = Ui.button("¿Olvidaste tu contraseña?", "btn-link");
        Button submit = Ui.button("Entrar", "btn-primary");
        submit.setMaxWidth(Double.MAX_VALUE);
        Button register = Ui.button("Regístrate aquí", "btn-link");
        Label error = FormSupport.errorBox();
        Label info = FormSupport.infoBox();
        FormSupport.show(info, notice);

        Runnable doLogin = () -> {
            FormSupport.show(error, null);
            if (identifier.getText().isBlank() || password.getText().isEmpty()) {
                FormSupport.show(error, "Ingrese su correo o usuario y su contraseña.");
                return;
            }
            submit.setDisable(true);
            submit.setText("Ingresando…");
            Async.run(() -> ctx.auth().login(identifier.getText().trim(), password.getText(), remember.isSelected()),
                    user -> nav.show(new ShellView(ctx, nav).build()),
                    t -> {
                        submit.setDisable(false);
                        submit.setText("Entrar");
                        FormSupport.show(error, t.getMessage());
                    });
        };
        submit.setOnAction(e -> doLogin.run());
        identifier.setOnAction(e -> doLogin.run());
        password.onEnter(doLogin);
        forgot.setOnAction(e -> nav.show(new RecoveryView(ctx, nav).build()));
        register.setOnAction(e -> nav.show(new RegisterView(ctx, nav).build()));

        VBox card = AuthLayout.formCard(420,
                Ui.label("Iniciar sesión", "h1"),
                Ui.label("Accede a tu cuenta para continuar", "muted"),
                info, error,
                FormSupport.field("Correo o usuario", identifier),
                FormSupport.field("Contraseña", password),
                Ui.row(8, remember, Ui.spacer(), forgot),
                submit,
                Ui.row(4, Ui.label("¿No tienes una cuenta?", "muted"), register));
        return AuthLayout.wrap(card);
    }
}
