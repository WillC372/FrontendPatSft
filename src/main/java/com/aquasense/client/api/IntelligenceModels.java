package com.aquasense.client.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class IntelligenceModels {

    private IntelligenceModels() {
    }

    public record AnalysisRequest(String profileId, Instant from, Instant to, boolean includeSimulated) {
    }

    public record ScenarioRequest(String profileId, BigDecimal ph, BigDecimal delta) {
    }

    public record StatisticsDto(int count, double mean, double median, double min, double max,
                                double standardDeviation) {
    }

    public record FindingDto(String type, String severity, Instant measuredAt, double ph, String message,
                             String explanation) {
    }

    public record TrendDto(String direction, double slopePerDay, double rSquared, double firstHalfMean,
                           double secondHalfMean, String summary) {
    }

    public record ForecastPointDto(Instant at, double predicted, double lower, double upper) {
    }

    public record ForecastDto(boolean available, String reason, int horizonHours, List<ForecastPointDto> points,
                              String method, String limitations) {
    }

    public record ReportDto(String profileName, int measurementCount, int simulatedCount, boolean sufficientData,
                            StatisticsDto statistics, List<FindingDto> anomalies, TrendDto trend,
                            ForecastDto forecast, List<String> recommendations, List<String> limitations,
                            String disclaimer) {
    }

    public record AnalysisResultDto(String analysisId, Instant createdAt, int alertsCreated, ReportDto report) {
    }

    public record AlertDto(String id, String type, String severity, Instant measuredAt, BigDecimal ph,
                           String message, String explanation, Instant createdAt, Instant acknowledgedAt) {
    }

    public record ZoneDto(BigDecimal ph, String acidity, String status, boolean withinRecommendedRange) {
    }

    public record ScenarioDto(boolean hypothetical, BigDecimal baselinePh, ZoneDto baseline, BigDecimal scenarioPh,
                              ZoneDto scenario, String comparison, String followUp, String notice) {
    }
}
