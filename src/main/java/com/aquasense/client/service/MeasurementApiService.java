package com.aquasense.client.service;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.api.ApiModels.MeasurementDto;
import com.aquasense.client.api.ApiModels.MeasurementRequest;
import com.aquasense.client.api.ApiModels.PageDto;
import com.aquasense.client.device.PhReading;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.Instant;

public class MeasurementApiService {

    private final ApiClient api;

    public MeasurementApiService(ApiClient api) {
        this.api = api;
    }

    public MeasurementDto save(String deviceId, String profileId, PhReading reading) {
        return api.post("/api/v1/measurements",
                new MeasurementRequest(deviceId, profileId, reading.ph(), reading.measuredAt()), MeasurementDto.class);
    }

    public PageDto<MeasurementDto> search(Instant from, String source, int page, int size) {
        StringBuilder path = new StringBuilder("/api/v1/measurements?page=" + page + "&size=" + size);
        if (from != null) {
            path.append("&from=").append(from);
        }
        if (source != null) {
            path.append("&source=").append(source);
        }
        return api.get(path.toString(), new TypeReference<PageDto<MeasurementDto>>() { });
    }
}
