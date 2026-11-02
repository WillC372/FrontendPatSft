package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.api.ApiModels.ClassificationDto;
import com.aquasense.client.api.ApiModels.DeviceDto;
import com.aquasense.client.api.ApiModels.MeasurementDto;
import com.aquasense.client.api.ApiModels.ProfileDto;
import com.aquasense.client.device.ConnectionState;
import com.aquasense.client.device.DeviceConnector;
import com.aquasense.client.device.PhReading;
import com.aquasense.client.device.command.CommandInvoker;
import com.aquasense.client.device.command.ConnectCommand;
import com.aquasense.client.device.command.DisconnectCommand;
import com.aquasense.client.device.command.MeasureCommand;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Ui;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.util.StringConverter;
import javafx.scene.layout.VBox;

public class MeasureView {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss",
            new Locale("es", "CO")).withZone(ZoneId.systemDefault());

    private final AppContext ctx;
    private final VBox content = new VBox(18);
    private final VBox devicesBox = new VBox(10);
    private final VBox resultBox = new VBox(10);
    private final VBox logBox = new VBox(4);
    private final Label error = FormSupport.errorBox();
    private final ComboBox<ProfileDto> profileChoice = new ComboBox<>();
    private final ComboBox<DeviceDto> deviceChoice = new ComboBox<>();
    private final Button measure = Ui.button("Medir ahora", "btn-primary");
    private List<DeviceDto> devices = List.of();

    public MeasureView(AppContext ctx) {
        this.ctx = ctx;
    }

    public Node build() {
        content.setPadding(new Insets(24));
        profileChoice.setConverter(converter(ProfileDto::name));
        deviceChoice.setConverter(converter(DeviceDto::name));
        deviceChoice.setPrefWidth(230);
        profileChoice.setPrefWidth(230);
        deviceChoice.setPromptText("Conecte un dispositivo");
        measure.setOnAction(e -> doMeasure());
        measure.setDisable(true);

        Button linkSim = Ui.button("Vincular simulador de pruebas", "btn-secondary");
        linkSim.setOnAction(e -> Async.run(() -> ctx.devices().registerSimulator(), d -> reloadDevices(),
                t -> FormSupport.show(error, t.getMessage())));

        content.getChildren().addAll(
                Ui.label("Dispositivos y medición", "h1"),
                Ui.wrapped("Conecte un dispositivo y realice una medición. El resultado se muestra antes de "
                        + "guardarlo; las gráficas están disponibles en el Historial.", "muted"),
                error,
                Ui.card("Dispositivos vinculados", devicesBox, Ui.row(8, linkSim),
                        Ui.wrapped("Los medidores físicos Bluetooth y USB requieren un conector que todavía no está "
                                + "implementado ni probado con hardware. Mientras tanto puede usar el simulador, "
                                + "cuyos datos siempre se identifican como SIMULACIÓN.", "small", "muted")),
                Ui.card("Nueva medición",
                        Ui.row(12, Ui.column(4, Ui.label("Dispositivo", "small", "muted"), deviceChoice),
                                Ui.column(4, Ui.label("Perfil de agua", "small", "muted"), profileChoice), measure),
                        resultBox),
                Ui.card("Actividad reciente", logBox));
        Async.run(() -> ctx.profiles().list(), profiles -> {
            profileChoice.getItems().setAll(profiles);
            profiles.stream().filter(p -> "GENERAL".equals(p.type())).findFirst()
                    .ifPresent(profileChoice::setValue);
        }, t -> FormSupport.show(error, t.getMessage()));
        reloadDevices();
        renderLog();
        return content;
    }

    private void reloadDevices() {
        Async.run(() -> ctx.devices().list(), list -> {
            devices = list;
            renderDevices();
        }, t -> FormSupport.show(error, t.getMessage()));
    }

    private void renderDevices() {
        devicesBox.getChildren().clear();
        if (devices.isEmpty()) {
            devicesBox.getChildren().add(Ui.label("No hay dispositivos vinculados.", "muted"));
        }
        for (DeviceDto d : devices) {
            devicesBox.getChildren().add(deviceRow(d));
        }
        List<DeviceDto> connected = devices.stream().filter(this::isConnected).toList();
        DeviceDto previous = deviceChoice.getValue();
        deviceChoice.getItems().setAll(connected);
        if (!connected.isEmpty()) {
            deviceChoice.setValue(previous != null && connected.contains(previous) ? previous : connected.get(0));
        }
        measure.setDisable(connected.isEmpty());
    }

    private boolean isConnected(DeviceDto d) {
        try {
            return ctx.connectors().forDevice(d).state() == ConnectionState.CONNECTED;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private Node deviceRow(DeviceDto d) {
        boolean simulated = "SIMULATED".equals(d.sourceKind());
        DeviceConnector connector = null;
        String problem = null;
        try {
            connector = ctx.connectors().forDevice(d);
        } catch (RuntimeException e) {
            problem = e.getMessage();
        }
        var row = Ui.row(10, Ui.label(d.name(), "h3"),
                simulated ? Ui.chip("SIMULACIÓN", "sim") : Ui.chip("Real", "ok"));
        if (connector != null) {
            DeviceConnector c = connector;
            ConnectionState st = c.state();
            row.getChildren().add(Ui.chip(st.label(), st == ConnectionState.CONNECTED ? "ok"
                    : st == ConnectionState.ERROR ? "danger" : "neutral"));
            row.getChildren().add(Ui.spacer());
            boolean on = st == ConnectionState.CONNECTED;
            Button toggle = Ui.button(on ? "Desconectar" : "Conectar", "btn-secondary");
            toggle.setOnAction(e -> run(on ? new DisconnectCommand(c) : new ConnectCommand(c)));
            row.getChildren().add(toggle);
        } else {
            row.getChildren().add(Ui.spacer());
            row.getChildren().add(Ui.chip("Conector no disponible", "neutral"));
        }
        Button unlink = Ui.button("Desvincular", "btn-secondary");
        unlink.getStyleClass().add("btn-danger");
        unlink.setOnAction(e -> Async.run(() -> {
            ctx.devices().unlink(d.id());
            return Boolean.TRUE;
        }, ok -> reloadDevices(), t -> FormSupport.show(error, t.getMessage())));
        row.getChildren().add(unlink);
        VBox box = new VBox(4, row);
        if (problem != null) {
            box.getChildren().add(Ui.wrapped(problem, "small", "muted"));
        }
        return box;
    }

    private void run(com.aquasense.client.device.command.DeviceCommand<Void> command) {
        FormSupport.show(error, null);
        Async.run(() -> ctx.invoker().run(command), ok -> {
            renderDevices();
            renderLog();
        }, t -> {
            FormSupport.show(error, t.getMessage());
            renderDevices();
            renderLog();
        });
    }

    private void doMeasure() {
        FormSupport.show(error, null);
        DeviceDto device = deviceChoice.getValue();
        ProfileDto profile = profileChoice.getValue();
        if (device == null || profile == null) {
            FormSupport.show(error, "Seleccione un dispositivo conectado y un perfil de agua.");
            return;
        }
        measure.setDisable(true);
        DeviceConnector connector = ctx.connectors().forDevice(device);
        Async.run(() -> {
            PhReading reading = ctx.invoker().run(new MeasureCommand(connector));
            ClassificationDto classification = ctx.profiles().classify(profile.id(), reading.ph());
            return new Object[] {reading, classification};
        }, result -> {
            measure.setDisable(false);
            showResult(device, profile, (PhReading) result[0], (ClassificationDto) result[1]);
            renderDevices();
            renderLog();
        }, t -> {
            measure.setDisable(false);
            FormSupport.show(error, t.getMessage());
            renderDevices();
            renderLog();
        });
    }

    private void showResult(DeviceDto device, ProfileDto profile, PhReading reading, ClassificationDto c) {
        String variant = switch (c.status()) {
            case "OPTIMAL" -> "ok";
            case "CAUTION" -> "warn";
            default -> "danger";
        };
        String statusText = switch (c.status()) {
            case "OPTIMAL" -> "En rango recomendado";
            case "CAUTION" -> "Precaución";
            default -> "Estado crítico";
        };
        Button save = Ui.button("Guardar medición", "btn-primary");
        Button discard = Ui.button("Descartar", "btn-secondary");
        Label saved = FormSupport.infoBox();
        Label saveError = FormSupport.errorBox();
        save.setOnAction(e -> {
            save.setDisable(true);
            Async.run(() -> ctx.measurements().save(device.id(), profile.id(), reading),
                    (MeasurementDto m) -> {
                        discard.setDisable(true);
                        FormSupport.show(saved, "Medición guardada en su historial."
                                + ("SUSPECT".equals(m.validationStatus())
                                        ? " Marcada como sospechosa: " + m.validationNotes() : ""));
                    },
                    t -> {
                        save.setDisable(false);
                        FormSupport.show(saveError, t.getMessage());
                    });
        });
        discard.setOnAction(e -> resultBox.getChildren().clear());

        resultBox.getChildren().setAll(
                Ui.row(12, Ui.label(reading.ph().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() + " pH", "h1"), Ui.chip(statusText, variant),
                        reading.simulated() ? Ui.chip("SIMULACIÓN", "sim") : Ui.chip("Medición real", "ok")),
                Ui.wrapped(c.explanation(), ""),
                Ui.label("Dispositivo: " + device.name() + "   ·   Perfil: " + profile.name() + "   ·   "
                        + TIME.format(reading.measuredAt()), "small", "muted"),
                Ui.wrapped(c.disclaimer(), "small", "muted"),
                saved, saveError,
                Ui.row(10, save, discard));
    }

    private void renderLog() {
        logBox.getChildren().clear();
        List<CommandInvoker.Entry> history = ctx.invoker().history();
        if (history.isEmpty()) {
            logBox.getChildren().add(Ui.label("Sin actividad todavía.", "muted"));
            return;
        }
        for (int i = history.size() - 1; i >= Math.max(0, history.size() - 8); i--) {
            CommandInvoker.Entry entry = history.get(i);
            logBox.getChildren().add(Ui.row(8, Ui.label(TIME.format(entry.at()), "small", "muted"),
                    Ui.label(entry.description(), "small"),
                    Ui.chip(entry.success() ? "Correcto" : entry.message(), entry.success() ? "ok" : "danger")));
        }
    }

    private static <T> StringConverter<T> converter(java.util.function.Function<T, String> label) {
        return new StringConverter<>() {
            @Override
            public String toString(T value) {
                return value == null ? "" : label.apply(value);
            }

            @Override
            public T fromString(String text) {
                return null;
            }
        };
    }
}
