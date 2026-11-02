package com.aquasense.client.service;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.api.ApiModels.DeviceDto;
import com.aquasense.client.api.ApiModels.DeviceRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.List;

public class DeviceApiService {

    public static final String SIMULATOR_EXTERNAL_ID = "simulador-local";

    private final ApiClient api;

    public DeviceApiService(ApiClient api) {
        this.api = api;
    }

    public List<DeviceDto> list() {
        return api.get("/api/v1/devices", new TypeReference<List<DeviceDto>>() { });
    }

    public DeviceDto registerSimulator() {
        return api.post("/api/v1/devices", new DeviceRequest("Simulador de pruebas", "AquaSense", "Simulador",
                SIMULATOR_EXTERNAL_ID, "SIMULATOR"), DeviceDto.class);
    }

    public void unlink(String id) {
        api.delete("/api/v1/devices/" + id);
    }
}
