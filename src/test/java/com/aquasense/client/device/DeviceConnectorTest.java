package com.aquasense.client.device;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aquasense.client.api.ApiModels.DeviceDto;
import com.aquasense.client.device.command.CommandInvoker;
import com.aquasense.client.device.command.ConnectCommand;
import com.aquasense.client.device.command.MeasureCommand;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class DeviceConnectorTest {

    /** TEST DOUBLE: fake hardware that can be told to fail or return bad values. */
    static class ScriptedConnector extends AbstractDeviceConnector {
        BigDecimal next = new BigDecimal("7.10");
        boolean failOpen;

        @Override public String displayName() { return "Dispositivo de prueba"; }
        @Override public boolean isSimulation() { return true; }
        @Override protected void openChannel() {
            if (failOpen) {
                throw new DeviceException("No se encontró el dispositivo.");
            }
        }
        @Override protected void closeChannel() { }
        @Override protected BigDecimal readPh() { return next; }
    }

    @Test
    void followsStateLifecycleAndNotifiesObservers() {
        ScriptedConnector c = new ScriptedConnector();
        List<ConnectionState> states = new ArrayList<>();
        List<PhReading> readings = new ArrayList<>();
        c.addListener(new DeviceListener() {
            @Override public void onStateChanged(ConnectionState s, String d) { states.add(s); }
            @Override public void onReading(PhReading r) { readings.add(r); }
        });
        assertThat(c.state()).isEqualTo(ConnectionState.DISCONNECTED);
        c.connect();
        PhReading reading = c.measure();
        c.disconnect();
        assertThat(states).containsExactly(ConnectionState.CONNECTED, ConnectionState.MEASURING,
                ConnectionState.CONNECTED, ConnectionState.DISCONNECTED);
        assertThat(readings).containsExactly(reading);
        assertThat(reading.ph()).isEqualByComparingTo("7.10");
        assertThat(reading.simulated()).isTrue();
    }

    @Test
    void cannotMeasureWhenDisconnected() {
        ScriptedConnector c = new ScriptedConnector();
        assertThatThrownBy(c::measure).isInstanceOf(DeviceException.class).hasMessageContaining("Desconectado");
        assertThat(c.state()).isEqualTo(ConnectionState.DISCONNECTED);
    }

    @Test
    void invalidDeviceValueMovesToErrorAndAllowsReconnect() {
        ScriptedConnector c = new ScriptedConnector();
        c.connect();
        c.next = new BigDecimal("19.4");
        assertThatThrownBy(c::measure).hasMessageContaining("inválido");
        assertThat(c.state()).isEqualTo(ConnectionState.ERROR);
        assertThatThrownBy(c::measure).isInstanceOf(DeviceException.class);
        c.connect();
        assertThat(c.state()).isEqualTo(ConnectionState.CONNECTED);
    }

    @Test
    void failedConnectionLeavesErrorState() {
        ScriptedConnector c = new ScriptedConnector();
        c.failOpen = true;
        assertThatThrownBy(c::connect).hasMessageContaining("No se encontró");
        assertThat(c.state()).isEqualTo(ConnectionState.ERROR);
    }

    @Test
    void simulatorIsIdentifiedAsSimulationAndStaysInScale() {
        SimulatedPhConnector sim = new SimulatedPhConnector(7.2, new Random(42));
        assertThat(sim.displayName()).containsIgnoringCase("simulad");
        sim.connect();
        for (int i = 0; i < 200; i++) {
            PhReading r = sim.measure();
            assertThat(r.simulated()).isTrue();
            assertThat(r.ph()).isBetween(BigDecimal.ZERO, new BigDecimal("14"));
            assertThat(r.ph().scale()).isEqualTo(2);
        }
        assertThat(sim.supportsCalibration()).isFalse();
    }

    @Test
    void factoryCreatesSimulatorsCachesThemAndRefusesUnavailableHardware() {
        ConnectorFactory factory = new ConnectorFactory();
        DeviceDto sim = new DeviceDto("d1", "Sim", null, null, "sim", "SIMULATOR", "SIMULATED", null);
        assertThat(factory.forDevice(sim)).isSameAs(factory.forDevice(sim));
        DeviceDto bt = new DeviceDto("d2", "BT", null, null, "AA:BB", "BLUETOOTH", "REAL", null);
        assertThatThrownBy(() -> factory.forDevice(bt)).isInstanceOf(DeviceException.class)
                .hasMessageContaining("medidor físico");
    }

    @Test
    void commandInvokerRecordsSuccessAndFailure() {
        ScriptedConnector c = new ScriptedConnector();
        CommandInvoker invoker = new CommandInvoker();
        assertThatThrownBy(() -> invoker.run(new MeasureCommand(c))).isInstanceOf(DeviceException.class);
        invoker.run(new ConnectCommand(c));
        PhReading r = invoker.run(new MeasureCommand(c));
        assertThat(r.ph()).isEqualByComparingTo("7.10");
        assertThat(invoker.history()).extracting(CommandInvoker.Entry::success).containsExactly(false, true, true);
        assertThat(invoker.history().get(0).message()).contains("Desconectado");
    }
}
