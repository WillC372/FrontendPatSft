package com.aquasense.client.device.state;

import com.aquasense.client.device.ConnectionState;

public class DisconnectedState extends BaseState {

    @Override
    public ConnectionState kind() {
        return ConnectionState.DISCONNECTED;
    }

    @Override
    public DeviceState connect() {
        return new ConnectedState();
    }

    @Override
    public DeviceState disconnect() {
        return this;
    }
}
