package com.aquasense.client.device;

public interface DeviceListener {

    default void onStateChanged(ConnectionState state, String detail) {
    }

    default void onReading(PhReading reading) {
    }
}
