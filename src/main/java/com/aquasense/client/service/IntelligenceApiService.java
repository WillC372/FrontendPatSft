package com.aquasense.client.service;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.api.IntelligenceModels.AlertDto;
import com.aquasense.client.api.IntelligenceModels.AnalysisRequest;
import com.aquasense.client.api.IntelligenceModels.AnalysisResultDto;
import com.aquasense.client.api.IntelligenceModels.ScenarioDto;
import com.aquasense.client.api.IntelligenceModels.ScenarioRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class IntelligenceApiService {

    private final ApiClient api;

    public IntelligenceApiService(ApiClient api) {
        this.api = api;
    }

    public AnalysisResultDto analyze(String profileId, Instant from, boolean includeSimulated) {
        return api.post("/api/v1/analysis", new AnalysisRequest(profileId, from, null, includeSimulated),
                AnalysisResultDto.class);
    }

    public ScenarioDto simulate(String profileId, BigDecimal ph, BigDecimal delta) {
        return api.post("/api/v1/analysis/scenario", new ScenarioRequest(profileId, ph, delta), ScenarioDto.class);
    }

    public List<AlertDto> openAlerts() {
        return api.get("/api/v1/analysis/alerts?onlyOpen=true", new TypeReference<List<AlertDto>>() { });
    }

    public AlertDto acknowledge(String id) {
        return api.post("/api/v1/analysis/alerts/" + id + "/acknowledge", null, AlertDto.class);
    }
}
