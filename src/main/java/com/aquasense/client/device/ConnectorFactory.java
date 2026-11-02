package com.aquasense.client.device;

import com.aquasense.client.api.ApiModels.DeviceDto;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class ConnectorFactory {

    private final Map<String, DeviceConnector> cache = new ConcurrentHashMap<>();

    public DeviceConnector forDevice(DeviceDto device) {
        return cache.computeIfAbsent(device.id(), id -> create(device));
    }

    DeviceConnector create(DeviceDto device) {
        return switch (device.connectionType()) {
            case "SIMULATOR" -> new SimulatedPhConnector();
            case "BLUETOOTH", "USB_SERIAL" -> throw new DeviceException(
                    "El conector " + device.connectionType() + " todavía no está disponible: requiere "
                            + "implementarse y probarse con un medidor físico.");
            default -> throw new DeviceException("Tipo de conexión no soportado: " + device.connectionType());
        };
    }

    public void clear() {
        cache.values().forEach(c -> {
            try {
                c.disconnect();
            } catch (DeviceException ignored) {
                // closing the app: nothing to recover
            }
        });
        cache.clear();
    }
}
