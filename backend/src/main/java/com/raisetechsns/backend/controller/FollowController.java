package com.raisetechsns.backend.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.raisetechsns.backend.dto.FollowActionResponse;
import com.raisetechsns.backend.dto.FollowListResponse;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.service.FollowService;

@RestController
@RequestMapping("/api/users/{userId}")
public class FollowController {

    private final FollowService followService;

    public FollowController(FollowService followService) {
        this.followService = followService;
    }

    @PostMapping("/follow")
    public FollowActionResponse follow(@PathVariable Long userId, @AuthenticationPrincipal User user) {
        return followService.follow(userId, user);
    }

    @DeleteMapping("/follow")
    public FollowActionResponse unfollow(@PathVariable Long userId, @AuthenticationPrincipal User user) {
        return followService.unfollow(userId, user);
    }

    @GetMapping("/followers")
    public FollowListResponse followers(@PathVariable Long userId, @AuthenticationPrincipal User user) {
        return followService.listFollowers(userId, user.getId());
    }

    @GetMapping("/following")
    public FollowListResponse following(@PathVariable Long userId, @AuthenticationPrincipal User user) {
        return followService.listFollowing(userId, user.getId());
    }
}
