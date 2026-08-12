package com.raisetechsns.backend.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.raisetechsns.backend.dto.LikeResponse;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.service.LikeService;

@RestController
@RequestMapping("/api/posts/{postId}/likes")
public class LikeController {

    private final LikeService likeService;

    public LikeController(LikeService likeService) {
        this.likeService = likeService;
    }

    @PostMapping
    public LikeResponse like(@PathVariable Long postId, @AuthenticationPrincipal User user) {
        return likeService.like(postId, user);
    }

    @DeleteMapping
    public LikeResponse unlike(@PathVariable Long postId, @AuthenticationPrincipal User user) {
        return likeService.unlike(postId, user);
    }
}
