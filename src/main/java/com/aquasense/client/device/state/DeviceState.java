package com.aquasense.client.device.state;

import com.aquasense.client.device.ConnectionState;

public interface DeviceState {

    ConnectionState kind();

    DeviceState connect();

    DeviceState disconnect();

    DeviceState startMeasuring();

    DeviceState finishMeasuring();

    DeviceState startCalibrating();

    DeviceState finishCalibrating();

    DeviceState fail();
}
