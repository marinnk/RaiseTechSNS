package com.raisetechsns.backend.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.PostListResponse;
import com.raisetechsns.backend.dto.PostResponse;
import com.raisetechsns.backend.dto.UpdatePostRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.service.PostService;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public PostListResponse list(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(required = false) Long afterId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false, defaultValue = "all") String scope,
            @AuthenticationPrincipal User user) {
        return postService.list(limit, beforeId, afterId, user.getId(), userId, parseFollowingOnly(scope));
    }

    /**
     * {@code scope}は{@code all}（絞り込みなし）・{@code following}（フォロー中タブ用）のみ許可する。
     * それ以外の値はリクエストの誤りとして400にする。
     */
    private boolean parseFollowingOnly(String scope) {
        return switch (scope) {
            case "all" -> false;
            case "following" -> true;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scope must be 'all' or 'following'");
        };
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@Valid @RequestBody CreatePostRequest request, @AuthenticationPrincipal User user) {
        return postService.create(request, user);
    }

    @PutMapping("/{postId}")
    public PostResponse update(
            @PathVariable Long postId,
            @Valid @RequestBody UpdatePostRequest request,
            @AuthenticationPrincipal User user) {
        return postService.update(postId, request, user);
    }

    @DeleteMapping("/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long postId, @AuthenticationPrincipal User user) {
        postService.delete(postId, user);
    }
}
