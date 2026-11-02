package com.aquasense.client.device;

public interface DeviceConnector {

    String displayName();

    boolean isSimulation();

    boolean supportsCalibration();

    ConnectionState state();

    void connect();

    void disconnect();

    PhReading measure();

    void addListener(DeviceListener listener);

    void removeListener(DeviceListener listener);
}
