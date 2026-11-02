package com.aquasense.client.device.command;

import com.aquasense.client.device.DeviceConnector;

public class DisconnectCommand implements DeviceCommand<Void> {

    private final DeviceConnector connector;

    public DisconnectCommand(DeviceConnector connector) {
        this.connector = connector;
    }

    @Override
    public String description() {
        return "Desconectar " + connector.displayName();
    }

    @Override
    public Void execute() {
        connector.disconnect();
        return null;
    }
}
