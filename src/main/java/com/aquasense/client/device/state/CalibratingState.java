package com.aquasense.client.device.state;

import com.aquasense.client.device.ConnectionState;

public class CalibratingState extends BaseState {

    @Override
    public ConnectionState kind() {
        return ConnectionState.CALIBRATING;
    }

    @Override
    public DeviceState finishCalibrating() {
        return new ConnectedState();
    }

    @Override
    public DeviceState disconnect() {
        return new DisconnectedState();
    }
}
