package com.aquasense.client.device.state;

import com.aquasense.client.device.ConnectionState;

public class ConnectedState extends BaseState {

    @Override
    public ConnectionState kind() {
        return ConnectionState.CONNECTED;
    }

    @Override
    public DeviceState connect() {
        return this;
    }

    @Override
    public DeviceState disconnect() {
        return new DisconnectedState();
    }

    @Override
    public DeviceState startMeasuring() {
        return new MeasuringState();
    }

    @Override
    public DeviceState startCalibrating() {
        return new CalibratingState();
    }
}
