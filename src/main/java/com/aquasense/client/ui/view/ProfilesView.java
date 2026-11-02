package com.aquasense.client.ui.view;

import com.aquasense.client.AppContext;
import com.aquasense.client.api.ApiModels.ProfileDto;
import com.aquasense.client.api.ApiModels.ProfileRequest;
import com.aquasense.client.service.Async;
import com.aquasense.client.ui.Ui;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import javafx.geometry.Insets;
import javafx.scene.Node;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.control.TextInputDialog;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.VBox;

public class ProfilesView {

    private final AppContext ctx;
    private final VBox content = new VBox(16);
    private final VBox list = new VBox(14);
    private final Label error = FormSupport.errorBox();

    public ProfilesView(AppContext ctx) {
        this.ctx = ctx;
    }

    public Node build() {
        content.setPadding(new Insets(24));
        Button create = Ui.button("Nuevo perfil personalizado", "btn-primary");
        create.setOnAction(e -> openCreateDialog());
        content.getChildren().addAll(Ui.label("Perfiles de agua", "h1"),
                Ui.wrapped("Cada perfil define los rangos de pH de referencia según el uso del agua. Los perfiles del "
                        + "sistema no se modifican: duplíquelos para personalizarlos.", "muted"),
                Ui.row(8, create), error, list);
        reload();
        return content;
    }

    private void reload() {
        Async.run(() -> ctx.profiles().list(), this::render, t -> FormSupport.show(error, t.getMessage()));
    }

    private void render(List<ProfileDto> profiles) {
        list.getChildren().clear();
        for (ProfileDto p : profiles) {
            list.getChildren().add(card(p));
        }
    }

    private Node card(ProfileDto p) {
        Button duplicate = Ui.button("Duplicar", "btn-secondary");
        duplicate.setOnAction(e -> {
            TextInputDialog dialog = new TextInputDialog(p.name() + " (copia)");
            dialog.setTitle("Duplicar perfil");
            dialog.setHeaderText("Nombre del nuevo perfil personalizado");
            Optional<String> name = dialog.showAndWait();
            name.filter(n -> !n.isBlank()).ifPresent(n -> Async.run(() -> ctx.profiles().duplicate(p.id(), n),
                    created -> reload(), t -> FormSupport.show(error, t.getMessage())));
        });
        var actions = Ui.row(8, duplicate);
        if (!p.system()) {
            Button delete = Ui.button("Eliminar", "btn-secondary");
            delete.getStyleClass().add("btn-danger");
            delete.setOnAction(e -> {
                Alert confirm = new Alert(Alert.AlertType.CONFIRMATION, "¿Eliminar el perfil «" + p.name() + "»?",
                        ButtonType.OK, ButtonType.CANCEL);
                confirm.setHeaderText(null);
                if (confirm.showAndWait().filter(b -> b == ButtonType.OK).isPresent()) {
                    Async.run(() -> {
                        ctx.profiles().delete(p.id());
                        return Boolean.TRUE;
                    }, ok -> reload(), t -> FormSupport.show(error, t.getMessage()));
                }
            });
            actions.getChildren().add(delete);
        }
        VBox box = Ui.card(null,
                Ui.row(10, Ui.label(p.name(), "h3"), p.system() ? Ui.chip("Sistema", "neutral") : Ui.chip("Personalizado", "ok")),
                Ui.wrapped(p.description(), "muted"),
                Ui.label("Rango recomendado: " + plain(p.optimalMin()) + " – " + plain(p.optimalMax())
                        + "     Precaución: " + plain(p.cautionMin()) + " – " + plain(p.cautionMax()), ""),
                p.sourceReference() == null ? new VBox() : Ui.wrapped("Fuente: " + p.sourceReference(), "small", "muted"),
                actions);
        return box;
    }

    private void openCreateDialog() {
        Dialog<ProfileRequest> dialog = new Dialog<>();
        dialog.setTitle("Nuevo perfil personalizado");
        dialog.setHeaderText("Defina los rangos de pH de referencia");
        TextField name = FormSupport.text("Nombre");
        TextField description = FormSupport.text("Descripción");
        TextField optMin = FormSupport.text("p. ej. 6.5");
        TextField optMax = FormSupport.text("p. ej. 7.5");
        TextField cauMin = FormSupport.text("p. ej. 6.0");
        TextField cauMax = FormSupport.text("p. ej. 8.0");
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(10));
        String[] labels = {"Nombre", "Descripción", "Óptimo mínimo", "Óptimo máximo", "Precaución mínimo",
                "Precaución máximo"};
        TextField[] fields = {name, description, optMin, optMax, cauMin, cauMax};
        for (int i = 0; i < labels.length; i++) {
            grid.add(new Label(labels[i]), 0, i);
            grid.add(fields[i], 1, i);
        }
        dialog.getDialogPane().setContent(grid);
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);
        dialog.getDialogPane().getStylesheets().addAll(content.getScene().getStylesheets());
        dialog.setResultConverter(button -> {
            if (button != ButtonType.OK) {
                return null;
            }
            try {
                return new ProfileRequest(name.getText().trim(), description.getText().trim(),
                        new BigDecimal(optMin.getText().trim().replace(',', '.')),
                        new BigDecimal(optMax.getText().trim().replace(',', '.')),
                        new BigDecimal(cauMin.getText().trim().replace(',', '.')),
                        new BigDecimal(cauMax.getText().trim().replace(',', '.')));
            } catch (NumberFormatException e) {
                FormSupport.show(error, "Los rangos deben ser números válidos (por ejemplo 6.5).");
                return null;
            }
        });
        dialog.showAndWait().ifPresent(request -> {
            FormSupport.show(error, null);
            Async.run(() -> ctx.profiles().create(request), created -> reload(),
                    t -> FormSupport.show(error, t.getMessage()));
        });
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
