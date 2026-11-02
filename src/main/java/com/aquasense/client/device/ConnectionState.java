package com.aquasense.client.device;

public enum ConnectionState {
    DISCONNECTED("Desconectado"),
    CONNECTED("Conectado"),
    MEASURING("Midiendo"),
    CALIBRATING("Calibrando"),
    ERROR("Error");

    private final String label;

    ConnectionState(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
