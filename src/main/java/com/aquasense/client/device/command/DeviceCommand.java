package com.aquasense.client.device.command;

public interface DeviceCommand<T> {

    String description();

    T execute();
}
