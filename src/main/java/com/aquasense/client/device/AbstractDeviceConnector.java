package com.aquasense.client.device;

import com.aquasense.client.device.state.DeviceState;
import com.aquasense.client.device.state.DisconnectedState;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public abstract class AbstractDeviceConnector implements DeviceConnector {

    private static final BigDecimal MAX_PH = new BigDecimal("14");

    private final List<DeviceListener> listeners = new CopyOnWriteArrayList<>();
    private DeviceState state = new DisconnectedState();

    @Override
    public synchronized ConnectionState state() {
        return state.kind();
    }

    @Override
    public synchronized void connect() {
        DeviceState next = state.connect();
        try {
            openChannel();
        } catch (DeviceException e) {
            state = state.fail();
            fireState(e.getMessage());
            throw e;
        }
        state = next;
        fireState("Conexión establecida con " + displayName() + ".");
    }

    @Override
    public synchronized void disconnect() {
        DeviceState next = state.disconnect();
        closeChannel();
        state = next;
        fireState("Dispositivo desconectado.");
    }

    @Override
    public final synchronized PhReading measure() {
        state = state.startMeasuring();
        fireState("Realizando medición…");
        try {
            BigDecimal value = readPh();
            if (value == null || value.signum() < 0 || value.compareTo(MAX_PH) > 0) {
                throw new DeviceException("El dispositivo devolvió un valor de pH inválido: " + value + ".");
            }
            PhReading reading = new PhReading(value, Instant.now(), isSimulation());
            state = state.finishMeasuring();
            fireState("Medición completada.");
            listeners.forEach(l -> l.onReading(reading));
            return reading;
        } catch (DeviceException e) {
            state = state.fail();
            fireState(e.getMessage());
            throw e;
        }
    }

    @Override
    public boolean supportsCalibration() {
        return false;
    }

    @Override
    public void addListener(DeviceListener listener) {
        listeners.add(listener);
    }

    @Override
    public void removeListener(DeviceListener listener) {
        listeners.remove(listener);
    }

    protected abstract void openChannel();

    protected abstract void closeChannel();

    protected abstract BigDecimal readPh();

    private void fireState(String detail) {
        ConnectionState kind = state.kind();
        listeners.forEach(l -> l.onStateChanged(kind, detail));
    }
}
