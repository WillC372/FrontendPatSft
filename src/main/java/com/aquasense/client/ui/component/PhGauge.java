package com.aquasense.client.ui.component;

import java.math.BigDecimal;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.paint.Color;
import javafx.scene.shape.ArcType;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.scene.text.TextAlignment;

public class PhGauge extends Canvas {

    private BigDecimal value;
    private Color accent = Color.web("#14c8c0");
    private Color track = Color.web("#dbe9f0");
    private Color textColor = Color.web("#0b2a3d");
    private Color mutedColor = Color.web("#5b7585");

    public PhGauge(double size) {
        super(size, size);
        draw();
    }

    public void setValue(BigDecimal ph, Color statusColor) {
        this.value = ph;
        if (statusColor != null) {
            this.accent = statusColor;
        }
        draw();
    }

    public void setPalette(Color track, Color text, Color muted) {
        this.track = track;
        this.textColor = text;
        this.mutedColor = muted;
        draw();
    }

    private void draw() {
        GraphicsContext g = getGraphicsContext2D();
        double size = getWidth();
        g.clearRect(0, 0, size, size);
        double stroke = size * 0.09;
        double pad = stroke;
        double diameter = size - 2 * pad;
        g.setLineWidth(stroke);
        g.setLineCap(javafx.scene.shape.StrokeLineCap.ROUND);
        g.setStroke(track);
        g.strokeArc(pad, pad, diameter, diameter, -45, 270, ArcType.OPEN);
        if (value != null) {
            double fraction = Math.max(0, Math.min(1, value.doubleValue() / 14.0));
            g.setStroke(accent);
            g.strokeArc(pad, pad, diameter, diameter, 225, -270 * fraction, ArcType.OPEN);
        }
        g.setTextAlign(TextAlignment.CENTER);
        g.setFill(textColor);
        g.setFont(Font.font("Segoe UI", FontWeight.BOLD, size * 0.22));
        g.fillText(value == null ? "—" : value.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
                size / 2, size / 2 + size * 0.05);
        g.setFill(mutedColor);
        g.setFont(Font.font("Segoe UI", FontWeight.NORMAL, size * 0.10));
        g.fillText("pH", size / 2, size / 2 + size * 0.17);
    }
}
