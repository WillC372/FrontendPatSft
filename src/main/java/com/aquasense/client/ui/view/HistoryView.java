package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.api.ApiModels.MeasurementDto;
import com.aquasense.client.api.ApiModels.PageDto;
import com.aquasense.client.api.ApiModels.ProfileDto;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Ui;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.layout.VBox;
import javafx.beans.property.SimpleStringProperty;

public class HistoryView {

    static final int MIN_POINTS_FOR_CHART = 3;
    private static final int PAGE_SIZE = 20;
    private static final int CHART_MAX_POINTS = 200;
    private static final DateTimeFormatter FULL = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm",
            new Locale("es", "CO")).withZone(ZoneId.systemDefault());
    private static final DateTimeFormatter SHORT = DateTimeFormatter.ofPattern("dd/MM HH:mm",
            new Locale("es", "CO")).withZone(ZoneId.systemDefault());

    private final AppContext ctx;
    private final VBox content = new VBox(18);
    private final TableView<MeasurementDto> table = new TableView<>();
    private final ComboBox<String> period = new ComboBox<>();
    private final ComboBox<String> source = new ComboBox<>();
    private final Label pageInfo = Ui.label("", "muted");
    private final Label error = FormSupport.errorBox();
    private final VBox chartBox = new VBox(10);
    private final Map<String, String> profileNames = new HashMap<>();
    private int page;
    private int totalPages;

    public HistoryView(AppContext ctx) {
        this.ctx = ctx;
    }

    public Node build() {
        content.setPadding(new Insets(24));
        period.getItems().setAll("Últimos 7 días", "Últimos 30 días", "Todo el historial");
        period.setValue("Últimos 7 días");
        source.getItems().setAll("Todas las mediciones", "Solo reales", "Solo simuladas");
        source.setValue("Todas las mediciones");
        Button search = Ui.button("Consultar", "btn-primary");
        search.setOnAction(e -> {
            page = 0;
            load();
        });
        Button previous = Ui.button("Anterior", "btn-secondary");
        previous.setOnAction(e -> {
            if (page > 0) {
                page--;
                load();
            }
        });
        Button next = Ui.button("Siguiente", "btn-secondary");
        next.setOnAction(e -> {
            if (page + 1 < totalPages) {
                page++;
                load();
            }
        });
        Button chart = Ui.button("Ver gráfica de evolución", "btn-secondary");
        chart.setOnAction(e -> showChart());

        buildTable();
        content.getChildren().addAll(
                Ui.label("Historial de mediciones", "h1"),
                Ui.wrapped("Consulte sus mediciones por periodo. La gráfica se genera solo cuando usted la solicita.",
                        "muted"),
                error,
                Ui.card(null, Ui.row(12, period, source, search, Ui.spacer(), chart)),
                Ui.card(null, table, Ui.row(10, previous, next, pageInfo)),
                chartBox);
        Async.run(() -> ctx.profiles().list(), profiles -> {
            for (ProfileDto p : profiles) {
                profileNames.put(p.id(), p.name());
            }
            load();
        }, t -> FormSupport.show(error, t.getMessage()));
        return content;
    }

    private void buildTable() {
        table.setPlaceholder(Ui.label("No hay mediciones para este periodo.", "muted"));
        table.setPrefHeight(430);
        table.getColumns().add(column("Fecha y hora", 150, m -> FULL.format(m.measuredAt())));
        table.getColumns().add(column("pH", 70, m -> m.ph().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString()));
        table.getColumns().add(column("Clasificación", 150,
                m -> acidity(m.acidity()) + " · " + status(m.rangeStatus())));
        table.getColumns().add(column("Perfil", 150, m -> profileNames.getOrDefault(m.profileId(), "—")));
        table.getColumns().add(column("Origen", 110, m -> "SIMULATED".equals(m.source()) ? "SIMULACIÓN" : "Real"));
        table.getColumns().add(column("Validación", 130,
                m -> "VALID".equals(m.validationStatus()) ? "Correcta" : "Sospechosa"));
    }

    private TableColumn<MeasurementDto, String> column(String title, double width,
                                                       java.util.function.Function<MeasurementDto, String> value) {
        TableColumn<MeasurementDto, String> column = new TableColumn<>(title);
        column.setPrefWidth(width);
        column.setCellValueFactory(cell -> new SimpleStringProperty(value.apply(cell.getValue())));
        return column;
    }

    private void load() {
        FormSupport.show(error, null);
        Instant from = fromInstant();
        String src = sourceFilter();
        Async.run(() -> ctx.measurements().search(from, src, page, PAGE_SIZE), (PageDto<MeasurementDto> result) -> {
            table.getItems().setAll(result.items());
            totalPages = Math.max(result.totalPages(), 1);
            pageInfo.setText("Página " + (result.page() + 1) + " de " + totalPages + " · "
                    + result.totalItems() + " mediciones");
        }, t -> FormSupport.show(error, t.getMessage()));
    }

    void showChart() {
        FormSupport.show(error, null);
        Instant from = fromInstant();
        String src = sourceFilter();
        Async.run(() -> ctx.measurements().search(from, src, 0, CHART_MAX_POINTS), result -> {
            chartBox.getChildren().setAll(buildChartCard(result.items(), result.totalItems()));
        }, t -> FormSupport.show(error, t.getMessage()));
    }

    static boolean hasEnoughData(int points) {
        return points >= MIN_POINTS_FOR_CHART;
    }

    private Node buildChartCard(List<MeasurementDto> items, long total) {
        if (!hasEnoughData(items.size())) {
            return Ui.card("Gráfica de evolución", Ui.wrapped("Se necesitan al menos " + MIN_POINTS_FOR_CHART
                    + " mediciones en el periodo para generar una gráfica útil. Hay " + items.size() + ".", "muted"));
        }
        List<MeasurementDto> ordered = items.stream().sorted(Comparator.comparing(MeasurementDto::measuredAt)).toList();
        CategoryAxis x = new CategoryAxis();
        NumberAxis y = new NumberAxis();
        y.setLabel("pH");
        y.setAutoRanging(false);
        double min = ordered.stream().map(MeasurementDto::ph).mapToDouble(BigDecimal::doubleValue).min().orElse(6);
        double max = ordered.stream().map(MeasurementDto::ph).mapToDouble(BigDecimal::doubleValue).max().orElse(8);
        y.setLowerBound(Math.max(0, Math.floor(min - 0.5)));
        y.setUpperBound(Math.min(14, Math.ceil(max + 0.5)));
        y.setTickUnit(0.5);
        LineChart<String, Number> chart = new LineChart<>(x, y);
        chart.setLegendVisible(false);
        chart.setAnimated(false);
        chart.setPrefHeight(340);
        XYChart.Series<String, Number> series = new XYChart.Series<>();
        for (MeasurementDto m : ordered) {
            series.getData().add(new XYChart.Data<>(SHORT.format(m.measuredAt()), m.ph()));
        }
        chart.getData().add(series);
        long simulated = ordered.stream().filter(m -> "SIMULATED".equals(m.source())).count();
        String note = (total > ordered.size() ? "Se muestran las " + ordered.size() + " mediciones más recientes de "
                + total + ". " : ordered.size() + " mediciones. ")
                + (simulated > 0 ? simulated + " son SIMULACIÓN." : "");
        return Ui.card("Evolución del pH", chart, Ui.label(note, "small", "muted"));
    }

    private Instant fromInstant() {
        return switch (period.getValue()) {
            case "Últimos 7 días" -> Instant.now().minus(7, ChronoUnit.DAYS);
            case "Últimos 30 días" -> Instant.now().minus(30, ChronoUnit.DAYS);
            default -> null;
        };
    }

    private String sourceFilter() {
        return switch (source.getValue()) {
            case "Solo reales" -> "REAL";
            case "Solo simuladas" -> "SIMULATED";
            default -> null;
        };
    }

    private static String acidity(String value) {
        return switch (value) {
            case "ACIDIC" -> "Ácida";
            case "ALKALINE" -> "Alcalina";
            default -> "Neutra";
        };
    }

    private static String status(String value) {
        return switch (value) {
            case "OPTIMAL" -> "Óptimo";
            case "CAUTION" -> "Precaución";
            default -> "Crítico";
        };
    }
}
