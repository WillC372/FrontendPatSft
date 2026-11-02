package com.aquasense.client.service;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.api.ApiModels.ClassificationDto;
import com.aquasense.client.api.ApiModels.DeviceDto;
import com.aquasense.client.api.ApiModels.MeasurementDto;
import com.aquasense.client.api.ApiModels.ProfileDto;
import java.util.Optional;

public class DashboardService {

    public record Snapshot(MeasurementDto measurement, ProfileDto profile, DeviceDto device,
                           ClassificationDto classification) {
    }

    private final ApiClient api;

    public DashboardService(ApiClient api) {
        this.api = api;
    }

    public Optional<Snapshot> latest() {
        MeasurementDto measurement = api.get("/api/v1/measurements/latest", MeasurementDto.class);
        if (measurement == null) {
            return Optional.empty();
        }
        ProfileDto profile = api.get("/api/v1/profiles/" + measurement.profileId(), ProfileDto.class);
        DeviceDto device = api.get("/api/v1/devices/" + measurement.deviceId(), DeviceDto.class);
        ClassificationDto classification = api.get("/api/v1/profiles/" + measurement.profileId()
                + "/classify?ph=" + measurement.ph().toPlainString(), ClassificationDto.class);
        return Optional.of(new Snapshot(measurement, profile, device, classification));
    }
}
