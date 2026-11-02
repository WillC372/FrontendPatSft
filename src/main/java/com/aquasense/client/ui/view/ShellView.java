package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Navigator;
import com.aquasense.client.ui.Ui;
import com.aquasense.client.ui.theme.ThemeManager.Theme;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.VBox;

public class ShellView {

    private final AppContext ctx;
    private final Navigator nav;
    private final BorderPane root = new BorderPane();
    private final Label title = Ui.label("", "h2");
    private final Map<String, Button> navButtons = new LinkedHashMap<>();

    public ShellView(AppContext ctx, Navigator nav) {
        this.ctx = ctx;
        this.nav = nav;
    }

    public Node build() {
        VBox sidebar = new VBox(6);
        sidebar.getStyleClass().add("sidebar");
        sidebar.setPadding(new Insets(22, 14, 18, 14));
        sidebar.setPrefWidth(230);
        sidebar.getChildren().addAll(Ui.label("AquaSense AI", "sidebar-brand"), new VBox(14));

        addSection(sidebar, "Inicio", () -> new DashboardView(ctx).build());
        addSection(sidebar, "Dispositivos y medición", () -> new MeasureView(ctx).build());
        addSection(sidebar, "Historial", () -> new HistoryView(ctx).build());
        addSection(sidebar, "AquaSense Intelligence", () -> new IntelligenceView(ctx).build());
        addSection(sidebar, "Perfiles de agua", () -> new ProfilesView(ctx).build());
        sidebar.getChildren().add(Ui.spacer());

        Button logout = Ui.button("Cerrar sesión", "nav-button");
        logout.setMaxWidth(Double.MAX_VALUE);
        logout.setOnAction(e -> {
            logout.setDisable(true);
            Async.run(() -> {
                ctx.auth().logout();
                return Boolean.TRUE;
            }, ok -> nav.show(new LoginView(ctx, nav, null).build()),
                    t -> nav.show(new LoginView(ctx, nav, null).build()));
        });
        sidebar.getChildren().add(logout);

        Button theme = Ui.button(themeLabel(), "btn-secondary");
        theme.setOnAction(e -> {
            ctx.themes().toggle();
            theme.setText(themeLabel());
        });
        String userName = ctx.session().user() != null ? ctx.session().user().displayName() : "";
        var topbar = Ui.row(14, title, Ui.spacer(), Ui.label(userName, "muted"), theme);
        topbar.setPadding(new Insets(14, 24, 14, 24));
        topbar.setAlignment(Pos.CENTER_LEFT);
        topbar.getStyleClass().add("topbar");

        root.setLeft(sidebar);
        root.setTop(topbar);
        select("Inicio");
        return root;
    }

    private void addSection(VBox sidebar, String name, Supplier<Node> factory) {
        Button button = Ui.button(name, "nav-button");
        button.setMaxWidth(Double.MAX_VALUE);
        button.setOnAction(e -> {
            navFactories.put(name, factory);
            select(name);
        });
        navFactories.put(name, factory);
        navButtons.put(name, button);
        sidebar.getChildren().add(button);
    }

    private final Map<String, Supplier<Node>> navFactories = new LinkedHashMap<>();

    private void select(String name) {
        navButtons.forEach((key, button) -> {
            button.getStyleClass().remove("nav-button-active");
            if (key.equals(name)) {
                button.getStyleClass().add("nav-button-active");
            }
        });
        title.setText(name);
        ScrollPane scroll = new ScrollPane(navFactories.get(name).get());
        scroll.setFitToWidth(true);
        scroll.setPadding(new Insets(0));
        root.setCenter(scroll);
    }

    private String themeLabel() {
        return ctx.themes().current() == Theme.LIGHT ? "Tema oscuro" : "Tema claro";
    }
}
