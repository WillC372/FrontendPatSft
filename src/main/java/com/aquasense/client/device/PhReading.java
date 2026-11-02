package com.aquasense.client.device;

import java.math.BigDecimal;
import java.time.Instant;

public record PhReading(BigDecimal ph, Instant measuredAt, boolean simulated) {
}
