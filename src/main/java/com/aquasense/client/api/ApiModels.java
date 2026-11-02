package com.aquasense.client.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ApiModels {

    private ApiModels() {
    }

    public record LoginRequest(String identifier, String password, boolean rememberMe) {
    }

    public record RegisterRequest(String displayName, String email, String username, String password,
                                  String confirmPassword) {
    }

    public record RefreshRequest(String refreshToken) {
    }

    public record ForgotPasswordRequest(String email) {
    }

    public record ResetPasswordRequest(String code, String newPassword, String confirmPassword) {
    }

    public record ProfileRequest(String name, String description, BigDecimal optimalMin, BigDecimal optimalMax,
                                 BigDecimal cautionMin, BigDecimal cautionMax) {
    }

    public record DuplicateRequest(String name) {
    }

    public record UserDto(String id, String email, String username, String displayName, List<String> roles) {
    }

    public record TokenDto(String accessToken, String refreshToken, String tokenType, long expiresInSeconds,
                           UserDto user) {
    }

    public record MessageDto(String message) {
    }

    public record ProfileDto(String id, String type, String name, String description, BigDecimal optimalMin,
                             BigDecimal optimalMax, BigDecimal cautionMin, BigDecimal cautionMax,
                             String sourceReference, boolean system) {
    }

    public record DeviceDto(String id, String name, String manufacturer, String model, String externalId,
                            String connectionType, String sourceKind, Instant lastSeenAt) {
    }

    public record MeasurementDto(String id, String deviceId, String profileId, BigDecimal ph, Instant measuredAt,
                                 String source, String acidity, String rangeStatus, String validationStatus,
                                 String validationNotes, String disclaimer) {
    }

    public record ClassificationDto(BigDecimal ph, String acidity, String status, boolean withinRecommendedRange,
                                    String explanation, String disclaimer) {
    }

    public record DeviceRequest(String name, String manufacturer, String model, String externalId,
                                String connectionType) {
    }

    public record MeasurementRequest(String deviceId, String profileId, BigDecimal ph, Instant measuredAt) {
    }

    public record PageDto<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    }
}
