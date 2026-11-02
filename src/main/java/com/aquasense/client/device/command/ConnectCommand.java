package com.aquasense.client.device.command;

import com.aquasense.client.device.DeviceConnector;

public class ConnectCommand implements DeviceCommand<Void> {

    private final DeviceConnector connector;

    public ConnectCommand(DeviceConnector connector) {
        this.connector = connector;
    }

    @Override
    public String description() {
        return "Conectar " + connector.displayName();
    }

    @Override
    public Void execute() {
        connector.connect();
        return null;
    }
}
