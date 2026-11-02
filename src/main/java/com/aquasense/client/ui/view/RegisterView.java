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

public class RegisterView {

    private final AppContext ctx;
    private final Navigator nav;

    public RegisterView(AppContext ctx, Navigator nav) {
        this.ctx = ctx;
        this.nav = nav;
    }

    public Node build() {
        TextField name = FormSupport.text("Nombre completo");
        TextField email = FormSupport.text("correo@ejemplo.com");
        TextField username = FormSupport.text("Opcional");
        PasswordInput password = new PasswordInput("Contraseña");
        PasswordInput confirm = new PasswordInput("Repite la contraseña");
        Label error = FormSupport.errorBox();
        Button submit = Ui.button("Crear cuenta", "btn-primary");
        submit.setMaxWidth(Double.MAX_VALUE);
        Button back = Ui.button("Volver a iniciar sesión", "btn-link");

        submit.setOnAction(e -> {
            String problem = validate(name.getText(), email.getText(), password.getText(), confirm.getText());
            FormSupport.show(error, problem);
            if (problem != null) {
                return;
            }
            submit.setDisable(true);
            submit.setText("Creando cuenta…");
            Async.run(() -> ctx.auth().register(name.getText(), email.getText(), username.getText(),
                            password.getText(), confirm.getText()),
                    user -> nav.show(new LoginView(ctx, nav, "Cuenta creada. Ya puede iniciar sesión.").build()),
                    t -> {
                        submit.setDisable(false);
                        submit.setText("Crear cuenta");
                        FormSupport.show(error, t.getMessage());
                    });
        });
        back.setOnAction(e -> nav.show(new LoginView(ctx, nav, null).build()));

        VBox card = AuthLayout.formCard(440,
                Ui.label("Crear cuenta", "h1"),
                Ui.label("Registra tus datos para empezar a monitorear", "muted"),
                error,
                FormSupport.field("Nombre", name),
                FormSupport.field("Correo electrónico", email),
                FormSupport.field("Usuario (opcional)", username),
                FormSupport.field("Contraseña", password),
                Ui.label(FormSupport.PASSWORD_HELP, "small", "muted"),
                FormSupport.field("Confirmar contraseña", confirm),
                submit, back);
        return AuthLayout.wrap(card);
    }

    public static String validate(String name, String email, String password, String confirm) {
        if (name.isBlank()) {
            return "Ingrese su nombre.";
        }
        if (!FormSupport.EMAIL.matcher(email.trim()).matches()) {
            return "Ingrese un correo electrónico válido.";
        }
        if (!FormSupport.PASSWORD.matcher(password).matches()) {
            return FormSupport.PASSWORD_HELP;
        }
        if (!password.equals(confirm)) {
            return "Las contraseñas no coinciden.";
        }
        return null;
    }
}
