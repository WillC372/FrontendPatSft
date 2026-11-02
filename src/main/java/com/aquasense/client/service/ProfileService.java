package com.aquasense.client.service;

import com.aquasense.client.api.ApiClient;
import com.aquasense.client.api.ApiModels.DuplicateRequest;
import com.aquasense.client.api.ApiModels.ProfileDto;
import com.aquasense.client.api.ApiModels.ProfileRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.List;

public class ProfileService {

    private final ApiClient api;

    public ProfileService(ApiClient api) {
        this.api = api;
    }

    public List<ProfileDto> list() {
        return api.get("/api/v1/profiles", new TypeReference<List<ProfileDto>>() { });
    }

    public ProfileDto get(String id) {
        return api.get("/api/v1/profiles/" + id, ProfileDto.class);
    }

    public ProfileDto duplicate(String id, String name) {
        return api.post("/api/v1/profiles/" + id + "/duplicate", new DuplicateRequest(name), ProfileDto.class);
    }

    public ProfileDto create(ProfileRequest request) {
        return api.post("/api/v1/profiles", request, ProfileDto.class);
    }

    public void delete(String id) {
        api.delete("/api/v1/profiles/" + id);
    }
}
