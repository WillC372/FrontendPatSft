package com.aquasense.client.ui.view;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HistoryChartRuleTest {

    @Test
    void chartRequiresMinimumNumberOfMeasurements() {
        assertThat(HistoryView.hasEnoughData(0)).isFalse();
        assertThat(HistoryView.hasEnoughData(2)).isFalse();
        assertThat(HistoryView.hasEnoughData(3)).isTrue();
        assertThat(HistoryView.hasEnoughData(50)).isTrue();
    }
}
