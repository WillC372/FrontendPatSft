package com.aquasense.client.device.command;

import com.aquasense.client.device.DeviceConnector;
import com.aquasense.client.device.PhReading;

public class MeasureCommand implements DeviceCommand<PhReading> {

    private final DeviceConnector connector;

    public MeasureCommand(DeviceConnector connector) {
        this.connector = connector;
    }

    @Override
    public String description() {
        return "Medir pH con " + connector.displayName();
    }

    @Override
    public PhReading execute() {
        return connector.measure();
    }
}
