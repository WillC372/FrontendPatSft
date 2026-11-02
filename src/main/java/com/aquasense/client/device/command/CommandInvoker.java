package com.aquasense.client.device.command;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CommandInvoker {

    public record Entry(Instant at, String description, boolean success, String message) {
    }

    private static final int MAX_ENTRIES = 50;

    private final List<Entry> log = Collections.synchronizedList(new ArrayList<>());

    public <T> T run(DeviceCommand<T> command) {
        try {
            T result = command.execute();
            record(command, true, "Correcto");
            return result;
        } catch (RuntimeException e) {
            record(command, false, e.getMessage());
            throw e;
        }
    }

    public List<Entry> history() {
        synchronized (log) {
            return List.copyOf(log);
        }
    }

    private void record(DeviceCommand<?> command, boolean success, String message) {
        synchronized (log) {
            log.add(new Entry(Instant.now(), command.description(), success, message));
            if (log.size() > MAX_ENTRIES) {
                log.remove(0);
            }
        }
    }
}
