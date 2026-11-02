package com.aquasense.client.device;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Random;

/** Simulation only: produces synthetic readings. Never a physical measurement. */
public class SimulatedPhConnector extends AbstractDeviceConnector {

    private final Random random;
    private double current;

    public SimulatedPhConnector(double basePh, Random random) {
        this.current = basePh;
        this.random = random;
    }

    public SimulatedPhConnector() {
        this(7.2, new Random());
    }

    @Override
    public String displayName() {
        return "Simulador de pH (datos simulados)";
    }

    @Override
    public boolean isSimulation() {
        return true;
    }

    @Override
    protected void openChannel() {
    }

    @Override
    protected void closeChannel() {
    }

    @Override
    protected BigDecimal readPh() {
        current = Math.max(0, Math.min(14, current + random.nextGaussian() * 0.08));
        return BigDecimal.valueOf(current).setScale(2, RoundingMode.HALF_UP);
    }
}
