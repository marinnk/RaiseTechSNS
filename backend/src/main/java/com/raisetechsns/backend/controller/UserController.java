package com.raisetechsns.backend.controller;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.raisetechsns.backend.dto.ProfileResponse;
import com.raisetechsns.backend.dto.UpdateProfileRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.service.ProfileService;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final ProfileService profileService;

    public UserController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{userId}")
    public ProfileResponse get(@PathVariable Long userId, @AuthenticationPrincipal User user) {
        return profileService.getProfile(userId, user.getId());
    }

    @PutMapping("/me")
    public ProfileResponse updateMe(@Valid @RequestBody UpdateProfileRequest request, @AuthenticationPrincipal User user) {
        return profileService.updateBio(request, user);
    }
}
