package com.aquasense.client.service;

import javafx.application.Platform;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import java.util.function.Supplier;

public final class Async {

    private static final ExecutorService POOL = Executors.newFixedThreadPool(4, runnable -> {
        Thread thread = new Thread(runnable, "aquasense-io");
        thread.setDaemon(true);
        return thread;
    });

    private Async() {
    }

    public static <T> void run(Supplier<T> work, Consumer<T> onSuccess, Consumer<Throwable> onError) {
        POOL.submit(() -> {
            try {
                T result = work.get();
                Platform.runLater(() -> onSuccess.accept(result));
            } catch (Throwable t) {
                Platform.runLater(() -> onError.accept(t));
            }
        });
    }

    public static void shutdown() {
        POOL.shutdownNow();
    }
}
