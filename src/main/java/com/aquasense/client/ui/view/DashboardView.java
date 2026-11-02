package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.service.Async;
import com.aquasense.client.service.DashboardService.Snapshot;
import com.aquasense.client.ui.Ui;
import com.aquasense.client.ui.component.PhGauge;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;

public class DashboardView {

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", new Locale("es", "CO")).withZone(ZoneId.systemDefault());

    private final AppContext ctx;
    private final VBox content = new VBox(18);

    public DashboardView(AppContext ctx) {
        this.ctx = ctx;
    }

    public Node build() {
        content.setPadding(new Insets(24));
        String name = ctx.session().user() != null ? ctx.session().user().displayName() : "";
        content.getChildren().addAll(Ui.label("¡Bienvenido, " + name + "!", "h1"),
                Ui.label("Monitorea la calidad del agua de forma inteligente", "muted"),
                Ui.label("Cargando la última medición…", "muted"));
        Async.run(() -> ctx.dashboard().latest(), this::render, t -> {
            content.getChildren().remove(content.getChildren().size() - 1);
            content.getChildren().add(Ui.card(null, Ui.wrapped(t.getMessage(), "error-text")));
        });
        return content;
    }

    private void render(Optional<Snapshot> snapshot) {
        content.getChildren().remove(content.getChildren().size() - 1);
        if (snapshot.isEmpty()) {
            content.getChildren().add(Ui.card("Última medición",
                    Ui.wrapped("Aún no hay mediciones registradas. Cuando vincule un dispositivo y realice una "
                            + "medición, aparecerá aquí.", "muted")));
            return;
        }
        Snapshot s = snapshot.get();
        String status = s.measurement().rangeStatus();
        Color color = switch (status) {
            case "OPTIMAL" -> Color.web("#11a36a");
            case "CAUTION" -> Color.web("#d98a00");
            default -> Color.web("#d6384a");
        };
        PhGauge gauge = new PhGauge(230);
        gauge.setValue(s.measurement().ph(), color);
        boolean dark = ctx.themes().current() == com.aquasense.client.ui.theme.ThemeManager.Theme.DARK;
        gauge.setPalette(dark ? Color.web("#1b3a58") : Color.web("#dbe9f0"),
                dark ? Color.web("#e6f4fb") : Color.web("#0b2a3d"), dark ? Color.web("#8fb0c4") : Color.web("#5b7585"));

        String statusText = switch (status) {
            case "OPTIMAL" -> "En rango recomendado";
            case "CAUTION" -> "Precaución";
            default -> "Estado crítico";
        };
        String variant = switch (status) {
            case "OPTIMAL" -> "ok";
            case "CAUTION" -> "warn";
            default -> "danger";
        };
        VBox gaugeBox = new VBox(10, gauge, Ui.chip(statusText, variant));
        gaugeBox.setAlignment(Pos.CENTER);

        boolean simulated = "SIMULATED".equals(s.measurement().source());
        VBox details = new VBox(8,
                Ui.row(8, Ui.label(acidityText(s.measurement().acidity()), "h2"),
                        simulated ? Ui.chip("SIMULACIÓN", "sim") : Ui.chip("Medición real", "ok")),
                Ui.wrapped(s.classification().explanation(), ""),
                Ui.label("Perfil: " + s.profile().name(), "muted"),
                Ui.label("Dispositivo: " + s.device().name(), "muted"),
                Ui.label("Fecha: " + FORMAT.format(s.measurement().measuredAt()), "muted"),
                Ui.label("Validación: " + ("VALID".equals(s.measurement().validationStatus()) ? "correcta"
                        : "sospechosa — " + s.measurement().validationNotes()), "muted"));
        details.setPrefWidth(420);

        FlowPane row = new FlowPane(24, 24, gaugeBox, details);
        VBox card = Ui.card("Última medición", row);
        content.getChildren().add(card);
        content.getChildren().add(Ui.card("Aviso", Ui.wrapped(s.classification().disclaimer(), "muted")));
    }

    private static String acidityText(String acidity) {
        return switch (acidity) {
            case "ACIDIC" -> "Ácida";
            case "ALKALINE" -> "Alcalina";
            default -> "Neutra";
        };
    }
}
