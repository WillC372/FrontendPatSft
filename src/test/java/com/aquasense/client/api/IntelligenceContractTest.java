package com.aquasense.client.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.aquasense.client.api.IntelligenceModels.AnalysisResultDto;
import com.aquasense.client.api.IntelligenceModels.ScenarioDto;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.io.InputStream;
import org.junit.jupiter.api.Test;

/** Contract test: the JSON fixtures were captured from a real run of the AquaSense backend. */
class IntelligenceContractTest {

    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule())
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    private <T> T read(String name, Class<T> type) throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/" + name)) {
            return mapper.readValue(in, type);
        }
    }

    @Test
    void parsesRealAnalysisResponse() throws Exception {
        AnalysisResultDto result = read("analysis-sample.json", AnalysisResultDto.class);
        assertThat(result.analysisId()).isNotBlank();
        assertThat(result.report().sufficientData()).isTrue();
        assertThat(result.report().statistics().count()).isEqualTo(11);
        assertThat(result.report().trend().direction()).isEqualTo("FALLING");
        assertThat(result.report().forecast().available()).isTrue();
        assertThat(result.report().forecast().points()).hasSize(3);
        assertThat(result.report().recommendations()).isNotEmpty();
        assertThat(result.report().limitations()).anyMatch(l -> l.contains("SIMULACIÓN"));
        assertThat(result.report().disclaimer()).contains("no demuestra");
    }

    @Test
    void parsesRealScenarioResponse() throws Exception {
        ScenarioDto scenario = read("scenario-sample.json", ScenarioDto.class);
        assertThat(scenario.hypothetical()).isTrue();
        assertThat(scenario.scenario().status()).isNotBlank();
        assertThat(scenario.notice()).contains("hipotético");
    }
}
