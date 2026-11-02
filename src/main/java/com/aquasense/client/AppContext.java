package com.aquasense.client;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.config.AppConfig;
import com.aquasense.client.service.AuthService;
import com.aquasense.client.service.DashboardService;
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
}
