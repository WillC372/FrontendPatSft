package com.aquasense.client.device.state;

import com.aquasense.client.device.DeviceException;

abstract class BaseState implements DeviceState {

    private DeviceException illegal(String action) {
        return new DeviceException("No se puede " + action + " mientras el dispositivo está en estado «"
                + kind().label() + "».");
    }

    @Override
    public DeviceState connect() {
        throw illegal("conectar");
    }

    @Override
    public DeviceState disconnect() {
        throw illegal("desconectar");
    }

    @Override
    public DeviceState startMeasuring() {
        throw illegal("medir");
    }

    @Override
    public DeviceState finishMeasuring() {
        throw illegal("finalizar la medición");
    }

    @Override
    public DeviceState startCalibrating() {
        throw illegal("calibrar");
    }

    @Override
    public DeviceState finishCalibrating() {
        throw illegal("finalizar la calibración");
    }

    @Override
    public DeviceState fail() {
        return new ErrorState();
    }
}
