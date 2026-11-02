package com.aquasense.client.device.state;

import com.aquasense.client.device.ConnectionState;

public class ErrorState extends BaseState {

    @Override
    public ConnectionState kind() {
        return ConnectionState.ERROR;
    }

    @Override
    public DeviceState connect() {
        return new ConnectedState();
    }

    @Override
    public DeviceState disconnect() {
        return new DisconnectedState();
    }

    @Override
    public DeviceState fail() {
        return this;
    }
}
