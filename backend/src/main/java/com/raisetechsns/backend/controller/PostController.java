package com.raisetechsns.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
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

    /**
     * テキストと画像（任意、最大4枚）を1回の投稿操作でまとめて送信するため、テキストのみの
     * 投稿でも{@code multipart/form-data}を使う。{@code data}パートにJSON形式の{@link CreatePostRequest}、
     * {@code images}パートに画像ファイル（0〜4枚）を積む。
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(
            @RequestPart("data") @Valid CreatePostRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal User user) {
        return postService.create(request, images, user);
    }

    @PutMapping(value = "/{postId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse update(
            @PathVariable Long postId,
            @RequestPart("data") @Valid UpdatePostRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal User user) {
        return postService.update(postId, request, images, user);
    }

    @DeleteMapping("/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long postId, @AuthenticationPrincipal User user) {
        postService.delete(postId, user);
    }
}
