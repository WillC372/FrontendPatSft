package com.aquasense.client.session;

import com.aquasense.client.api.ApiModels.TokenDto;
import com.aquasense.client.api.ApiModels.UserDto;

public final class Session {

    private String accessToken;
    private String refreshToken;
    private UserDto user;
    private boolean remember;

    public synchronized void start(TokenDto tokens, boolean remember) {
        this.accessToken = tokens.accessToken();
        this.refreshToken = tokens.refreshToken();
        this.user = tokens.user() != null ? tokens.user() : this.user;
        this.remember = remember;
    }

    public synchronized void updateUser(UserDto newUser) {
        this.user = newUser;
    }

    public synchronized void clear() {
        accessToken = null;
        refreshToken = null;
        user = null;
        remember = false;
    }

    public synchronized boolean isActive() {
        return accessToken != null;
    }

    public synchronized String accessToken() {
        return accessToken;
    }

    public synchronized String refreshToken() {
        return refreshToken;
    }

    public synchronized UserDto user() {
        return user;
    }

    public synchronized boolean remember() {
        return remember;
    }
}
