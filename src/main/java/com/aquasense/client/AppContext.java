package com.aquasense.client;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.config.AppConfig;
import com.aquasense.client.service.AuthService;
import com.aquasense.client.device.ConnectorFactory;
import com.aquasense.client.device.command.CommandInvoker;
import com.aquasense.client.service.DashboardService;
import com.aquasense.client.service.DeviceApiService;
import com.aquasense.client.service.IntelligenceApiService;
import com.aquasense.client.service.MeasurementApiService;
import com.aquasense.client.service.ProfileService;
import com.aquasense.client.session.RememberedSessionStore;
import com.aquasense.client.session.Session;
import com.aquasense.client.ui.theme.ThemeManager;

public final class AppContext {

    private final Session session = new Session();
    private final ApiClient api = new ApiClient(AppConfig.apiBaseUrl(), session);
    private final AuthService auth = new AuthService(api, session,
            new RememberedSessionStore(AppConfig.dataDirectory()));
    private final ProfileService profiles = new ProfileService(api);
    private final DashboardService dashboard = new DashboardService(api);
    private final DeviceApiService devices = new DeviceApiService(api);
    private final MeasurementApiService measurements = new MeasurementApiService(api);
    private final IntelligenceApiService intelligence = new IntelligenceApiService(api);
    private final ConnectorFactory connectors = new ConnectorFactory();
    private final CommandInvoker invoker = new CommandInvoker();
    private final ThemeManager themes = new ThemeManager(AppConfig.dataDirectory());

    public Session session() {
        return session;
    }

    public ApiClient api() {
        return api;
    }

    public AuthService auth() {
        return auth;
    }

    public ProfileService profiles() {
        return profiles;
    }

    public DashboardService dashboard() {
        return dashboard;
    }

    public ThemeManager themes() {
        return themes;
    }

    public DeviceApiService devices() {
        return devices;
    }

    public MeasurementApiService measurements() {
        return measurements;
    }

    public ConnectorFactory connectors() {
        return connectors;
    }

    public CommandInvoker invoker() {
        return invoker;
    }

    public IntelligenceApiService intelligence() {
        return intelligence;
    }
}
