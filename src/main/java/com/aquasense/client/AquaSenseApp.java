package com.aquasense.client;

import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Navigator;
import com.aquasense.client.ui.Ui;
import com.aquasense.client.ui.view.LoginView;
import com.aquasense.client.ui.view.ShellView;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class AquaSenseApp extends Application {

    private final AppContext ctx = new AppContext();
    private final Navigator nav = new Navigator();

    @Override
    public void start(Stage stage) {
        Scene scene = new Scene(nav.root(), 1180, 760);
        ctx.themes().attach(scene);
        stage.setTitle("AquaSense AI");
        stage.setMinWidth(900);
        stage.setMinHeight(620);
        stage.setScene(scene);
        stage.show();

        VBox splash = new VBox(8, Ui.label("AquaSense AI", "h1"), Ui.label("Iniciando…", "muted"));
        splash.setAlignment(Pos.CENTER);
        nav.show(splash);

        ctx.api().setOnSessionExpired(() -> Platform.runLater(() -> {
            ctx.session().clear();
            nav.show(new LoginView(ctx, nav, "Su sesión expiró. Inicie sesión nuevamente.").build());
        }));

        Async.run(() -> ctx.auth().restoreRememberedSession(),
                user -> nav.show(user.isPresent() ? new ShellView(ctx, nav).build()
                        : new LoginView(ctx, nav, null).build()),
                t -> nav.show(new LoginView(ctx, nav, null).build()));
    }

    @Override
    public void stop() {
        Async.shutdown();
    }
}
