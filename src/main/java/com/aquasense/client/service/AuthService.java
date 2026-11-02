package com.aquasense.client.service;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.api.ApiException;
import com.aquasense.client.api.ApiModels.ForgotPasswordRequest;
import com.aquasense.client.api.ApiModels.LoginRequest;
import com.aquasense.client.api.ApiModels.MessageDto;
import com.aquasense.client.api.ApiModels.RefreshRequest;
import com.aquasense.client.api.ApiModels.RegisterRequest;
import com.aquasense.client.api.ApiModels.ResetPasswordRequest;
import com.aquasense.client.api.ApiModels.TokenDto;
import com.aquasense.client.api.ApiModels.UserDto;
import com.aquasense.client.session.RememberedSessionStore;
import com.aquasense.client.session.Session;
import java.util.Optional;

public class AuthService {

    private final ApiClient api;
    private final Session session;
    private final RememberedSessionStore store;

    public AuthService(ApiClient api, Session session, RememberedSessionStore store) {
        this.api = api;
        this.session = session;
        this.store = store;
        api.setOnTokensRefreshed(tokens -> {
            if (session.remember()) {
                store.save(tokens.refreshToken());
            }
        });
    }

    public UserDto login(String identifier, String password, boolean remember) {
        TokenDto tokens = api.post("/api/v1/auth/login", new LoginRequest(identifier, password, remember),
                TokenDto.class);
        session.start(tokens, remember);
        if (remember) {
            store.save(tokens.refreshToken());
        } else {
            store.clear();
        }
        return tokens.user();
    }

    public UserDto register(String displayName, String email, String username, String password, String confirm) {
        String cleanUser = username == null || username.isBlank() ? null : username.trim();
        return api.post("/api/v1/auth/register",
                new RegisterRequest(displayName.trim(), email.trim(), cleanUser, password, confirm), UserDto.class);
    }

    public Optional<UserDto> restoreRememberedSession() {
        Optional<String> stored = store.load();
        if (stored.isEmpty()) {
            return Optional.empty();
        }
        try {
            TokenDto tokens = api.post("/api/v1/auth/refresh", new RefreshRequest(stored.get()), TokenDto.class);
            session.start(tokens, true);
            store.save(tokens.refreshToken());
            return Optional.ofNullable(tokens.user());
        } catch (ApiException e) {
            if (e.isUnauthorized()) {
                store.clear();
            }
            return Optional.empty();
        }
    }

    public void logout() {
        String refresh = session.refreshToken();
        try {
            if (refresh != null) {
                api.post("/api/v1/auth/logout", new RefreshRequest(refresh), Void.class);
            }
        } catch (ApiException ignored) {
            // the local session is closed regardless; the token expires server-side
        } finally {
            session.clear();
            store.clear();
        }
    }

    public String requestPasswordReset(String email) {
        return api.post("/api/v1/auth/forgot-password", new ForgotPasswordRequest(email.trim()), MessageDto.class)
                .message();
    }

    public String resetPassword(String code, String newPassword, String confirm) {
        return api.post("/api/v1/auth/reset-password", new ResetPasswordRequest(code.trim(), newPassword, confirm),
                MessageDto.class).message();
    }
}
