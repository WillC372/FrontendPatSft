package com.aquasense.client.device.state;

import com.aquasense.client.device.ConnectionState;

public class MeasuringState extends BaseState {

    @Override
    public ConnectionState kind() {
        return ConnectionState.MEASURING;
    }

    @Override
    public DeviceState finishMeasuring() {
        return new ConnectedState();
    }

    @Override
    public DeviceState disconnect() {
        return new DisconnectedState();
    }
}
