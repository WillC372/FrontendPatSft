package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.api.ApiModels.ProfileDto;
import com.aquasense.client.api.IntelligenceModels.AlertDto;
import com.aquasense.client.api.IntelligenceModels.AnalysisResultDto;
import com.aquasense.client.api.IntelligenceModels.FindingDto;
import com.aquasense.client.api.IntelligenceModels.ReportDto;
import com.aquasense.client.api.IntelligenceModels.ScenarioDto;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Ui;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.util.StringConverter;

public class IntelligenceView {

    private static final DateTimeFormatter FULL = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm",
            new Locale("es", "CO")).withZone(ZoneId.systemDefault());

    private final AppContext ctx;
    private final VBox content = new VBox(16);
    private final Label error = FormSupport.errorBox();
    private final ComboBox<ProfileDto> analysisProfile = profileCombo();
    private final ComboBox<ProfileDto> scenarioProfile = profileCombo();
    private final VBox analysisResult = new VBox(14);
    private final VBox scenarioResult = new VBox(12);
    private final VBox alertsBox = new VBox(10);

    public IntelligenceView(AppContext ctx) {
        this.ctx = ctx;
    }

    public Node build() {
        content.setPadding(new Insets(24));
        VBox area = new VBox();
        javafx.scene.layout.HBox tabBar = new javafx.scene.layout.HBox(6);
        java.util.Map<String, Node> sections = new java.util.LinkedHashMap<>();
        sections.put("Análisis", analysisTab());
        sections.put("Simulador de escenarios", scenarioTab());
        sections.put("Alertas", alertsTab());
        java.util.List<Button> tabButtons = new java.util.ArrayList<>();
        sections.forEach((name, node) -> {
            Button b = Ui.button(name, "tab-button");
            b.setOnAction(e -> {
                tabButtons.forEach(x -> x.getStyleClass().remove("tab-button-active"));
                b.getStyleClass().add("tab-button-active");
                area.getChildren().setAll(node);
            });
            tabButtons.add(b);
            tabBar.getChildren().add(b);
        });
        tabButtons.get(0).fire();
        VBox tabs = new VBox(0, tabBar, area);
        content.getChildren().addAll(Ui.label("AquaSense Intelligence", "h1"),
                Ui.wrapped("Análisis estadístico de sus mediciones: anomalías, tendencias, predicciones con "
                        + "incertidumbre y recomendaciones. Las gráficas se piden desde el Historial.", "muted"),
                error, tabs);
        Async.run(() -> ctx.profiles().list(), profiles -> {
            analysisProfile.getItems().setAll(profiles);
            scenarioProfile.getItems().setAll(profiles);
            profiles.stream().filter(p -> "GENERAL".equals(p.type())).findFirst().ifPresent(p -> {
                analysisProfile.setValue(p);
                scenarioProfile.setValue(p);
            });
        }, t -> FormSupport.show(error, t.getMessage()));
        Async.run(() -> ctx.dashboard().latest(), latest -> latest.ifPresent(snapshot -> {
            analysisProfile.getItems().stream().filter(p -> p.id().equals(snapshot.profile().id())).findFirst()
                    .ifPresent(p -> {
                        analysisProfile.setValue(p);
                        scenarioProfile.setValue(p);
                    });
        }), t -> { });
        loadAlerts();
        return content;
    }

    private Node analysisTab() {
        ComboBox<String> period = new ComboBox<>();
        period.getItems().setAll("Últimos 7 días", "Últimos 30 días", "Todo el historial");
        period.setValue("Últimos 30 días");
        CheckBox simulated = new CheckBox("Incluir mediciones simuladas");
        simulated.setSelected(true);
        Button run = Ui.button("Analizar", "btn-primary");
        run.setOnAction(e -> {
            ProfileDto profile = analysisProfile.getValue();
            if (profile == null) {
                FormSupport.show(error, "Seleccione un perfil de agua.");
                return;
            }
            FormSupport.show(error, null);
            run.setDisable(true);
            Instant from = switch (period.getValue()) {
                case "Últimos 7 días" -> Instant.now().minus(7, ChronoUnit.DAYS);
                case "Últimos 30 días" -> Instant.now().minus(30, ChronoUnit.DAYS);
                default -> null;
            };
            Async.run(() -> ctx.intelligence().analyze(profile.id(), from, simulated.isSelected()), result -> {
                run.setDisable(false);
                renderAnalysis(result);
                loadAlerts();
            }, t -> {
                run.setDisable(false);
                FormSupport.show(error, t.getMessage());
            });
        });
        return pad(Ui.column(14,
                Ui.card("Parámetros",
                        Ui.row(12, Ui.column(4, Ui.label("Perfil de agua", "small", "muted"), analysisProfile),
                                Ui.column(4, Ui.label("Periodo", "small", "muted"), period), simulated, run)),
                analysisResult));
    }

    private void renderAnalysis(AnalysisResultDto result) {
        ReportDto r = result.report();
        analysisResult.getChildren().clear();
        if (!r.sufficientData()) {
            analysisResult.getChildren().add(Ui.card("Datos insuficientes",
                    Ui.wrapped(String.join(" ", r.limitations()), ""),
                    Ui.wrapped(String.join(" ", r.recommendations()), "muted"),
                    Ui.wrapped(r.disclaimer(), "small", "muted")));
            return;
        }
        analysisResult.getChildren().add(Ui.card("Resumen del periodo",
                Ui.label(r.measurementCount() + " mediciones  ·  media " + f(r.statistics().mean()) + "  ·  mediana "
                        + f(r.statistics().median()) + "  ·  mín " + f(r.statistics().min()) + "  ·  máx "
                        + f(r.statistics().max()) + "  ·  desv. " + f(r.statistics().standardDeviation()), ""),
                r.simulatedCount() > 0 ? Ui.chip(r.simulatedCount() + " de " + r.measurementCount()
                        + " son SIMULACIÓN", "sim") : Ui.label("Todas son mediciones reales.", "small", "muted")));

        VBox anomalies = Ui.card("Anomalías detectadas");
        if (r.anomalies().isEmpty()) {
            anomalies.getChildren().add(Ui.label("No se detectaron anomalías estadísticas en este periodo.", "muted"));
        }
        for (FindingDto f : r.anomalies().stream().limit(8).toList()) {
            anomalies.getChildren().add(new VBox(2,
                    Ui.row(8, Ui.chip(severity(f.severity()), "CRITICAL".equals(f.severity()) ? "danger" : "warn"),
                            Ui.label(f.message(), "h3"), Ui.label(FULL.format(f.measuredAt()), "small", "muted")),
                    Ui.wrapped(f.explanation(), "small", "muted")));
        }
        if (r.anomalies().size() > 8) {
            anomalies.getChildren().add(Ui.label("… y " + (r.anomalies().size() - 8) + " más (las más recientes "
                    + "arriba).", "small", "muted"));
        }
        analysisResult.getChildren().add(anomalies);
        analysisResult.getChildren().add(Ui.card("Tendencia", Ui.wrapped(r.trend().summary(), ""),
                r.trend().direction().equals("INCONCLUSIVE") ? new VBox()
                        : Ui.label("Promedio primera mitad: " + f(r.trend().firstHalfMean())
                                + "   ·   segunda mitad: " + f(r.trend().secondHalfMean()), "small", "muted")));

        VBox forecast = Ui.card("Predicción");
        if (r.forecast().available()) {
            forecast.getChildren().add(Ui.label("Horizonte: " + r.forecast().horizonHours() + " horas  ·  "
                    + r.forecast().method(), "small", "muted"));
            r.forecast().points().forEach(p -> forecast.getChildren().add(Ui.label(FULL.format(p.at()) + "   →   pH "
                    + f(p.predicted()) + "   (intervalo 95 %: " + f(p.lower()) + " a " + f(p.upper()) + ")", "")));
            forecast.getChildren().add(Ui.wrapped(r.forecast().limitations(), "small", "muted"));
        } else {
            forecast.getChildren().add(Ui.wrapped("No se genera predicción. " + r.forecast().reason(), "muted"));
        }
        analysisResult.getChildren().add(forecast);

        VBox recs = Ui.card("Recomendaciones");
        r.recommendations().forEach(t -> recs.getChildren().add(Ui.wrapped("•  " + t, "")));
        analysisResult.getChildren().add(recs);
        VBox limits = Ui.card("Limitaciones");
        r.limitations().forEach(t -> limits.getChildren().add(Ui.wrapped("•  " + t, "small", "muted")));
        limits.getChildren().add(Ui.wrapped(r.disclaimer(), "small", "muted"));
        analysisResult.getChildren().add(limits);
        if (result.alertsCreated() > 0) {
            analysisResult.getChildren().add(Ui.chip(result.alertsCreated() + " alerta(s) nueva(s) en la pestaña "
                    + "Alertas", "warn"));
        }
    }

    private Node scenarioTab() {
        TextField ph = FormSupport.text("p. ej. 6.4");
        TextField delta = FormSupport.text("p. ej. -1.0");
        Button run = Ui.button("Simular", "btn-primary");
        run.setOnAction(e -> {
            ProfileDto profile = scenarioProfile.getValue();
            if (profile == null) {
                FormSupport.show(error, "Seleccione un perfil de agua.");
                return;
            }
            BigDecimal phValue;
            BigDecimal deltaValue;
            try {
                phValue = ph.getText().isBlank() ? null : new BigDecimal(ph.getText().trim().replace(',', '.'));
                deltaValue = delta.getText().isBlank() ? null : new BigDecimal(delta.getText().trim().replace(',', '.'));
            } catch (NumberFormatException ex) {
                FormSupport.show(error, "Ingrese números válidos (por ejemplo 6.4 o -1.0).");
                return;
            }
            FormSupport.show(error, null);
            run.setDisable(true);
            Async.run(() -> ctx.intelligence().simulate(profile.id(), phValue, deltaValue), s -> {
                run.setDisable(false);
                renderScenario(s);
            }, t -> {
                run.setDisable(false);
                FormSupport.show(error, t.getMessage());
            });
        });
        return pad(Ui.column(14,
                Ui.card("¿Qué pasaría si…?",
                        Ui.wrapped("Escriba un pH hipotético, o un cambio respecto a su última medición (por "
                                + "ejemplo -1.0). Es un escenario, no una predicción.", "muted"),
                        Ui.row(12, Ui.column(4, Ui.label("Perfil de agua", "small", "muted"), scenarioProfile),
                                Ui.column(4, Ui.label("pH hipotético", "small", "muted"), ph),
                                Ui.column(4, Ui.label("o cambio (delta)", "small", "muted"), delta), run)),
                scenarioResult));
    }

    private void renderScenario(ScenarioDto s) {
        scenarioResult.getChildren().setAll(Ui.card("Resultado del escenario (hipotético)",
                Ui.row(10, Ui.label("pH " + s.scenarioPh().toPlainString(), "h2"),
                        Ui.chip(zone(s.scenario().status()), variant(s.scenario().status())),
                        Ui.chip("HIPOTÉTICO", "neutral")),
                Ui.wrapped(s.comparison(), ""), Ui.wrapped(s.followUp(), "muted"),
                Ui.wrapped(s.notice(), "small", "muted")));
    }

    private Node alertsTab() {
        return pad(Ui.column(14, Ui.card("Alertas abiertas", alertsBox)));
    }

    private void loadAlerts() {
        Async.run(() -> ctx.intelligence().openAlerts(), this::renderAlerts,
                t -> FormSupport.show(error, t.getMessage()));
    }

    private void renderAlerts(List<AlertDto> alerts) {
        alertsBox.getChildren().clear();
        if (alerts.isEmpty()) {
            alertsBox.getChildren().add(Ui.label("No hay alertas abiertas.", "muted"));
        }
        for (AlertDto a : alerts) {
            Button ack = Ui.button("Marcar como atendida", "btn-secondary");
            ack.setOnAction(e -> Async.run(() -> ctx.intelligence().acknowledge(a.id()), x -> loadAlerts(),
                    t -> FormSupport.show(error, t.getMessage())));
            alertsBox.getChildren().add(new VBox(4,
                    Ui.row(8, Ui.chip(severity(a.severity()), "CRITICAL".equals(a.severity()) ? "danger" : "warn"),
                            Ui.label(a.message(), "h3"), Ui.spacer(), ack),
                    Ui.label(FULL.format(a.measuredAt()) + "  ·  pH " + a.ph().toPlainString(), "small", "muted"),
                    Ui.wrapped(a.explanation(), "small", "muted")));
        }
    }

    private VBox pad(VBox box) {
        box.setPadding(new Insets(14, 0, 0, 0));
        return box;
    }

    static String f(double value) {
        return String.format(Locale.US, "%.2f", value);
    }

    static String severity(String value) {
        return switch (value) {
            case "CRITICAL" -> "Crítica";
            case "WARNING" -> "Advertencia";
            default -> "Informativa";
        };
    }

    static String zone(String status) {
        return switch (status) {
            case "OPTIMAL" -> "En rango recomendado";
            case "CAUTION" -> "Precaución";
            default -> "Estado crítico";
        };
    }

    static String variant(String status) {
        return switch (status) {
            case "OPTIMAL" -> "ok";
            case "CAUTION" -> "warn";
            default -> "danger";
        };
    }

    private static ComboBox<ProfileDto> profileCombo() {
        ComboBox<ProfileDto> combo = new ComboBox<>();
        combo.setPrefWidth(230);
        combo.setConverter(new StringConverter<>() {
            @Override
            public String toString(ProfileDto p) {
                return p == null ? "" : p.name();
            }

            @Override
            public ProfileDto fromString(String s) {
                return null;
            }
        });
        return combo;
    }
}
