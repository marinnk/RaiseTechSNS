package com.raisetechsns.backend.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.raisetechsns.backend.dto.CommentListResponse;
import com.raisetechsns.backend.dto.CommentResponse;
import com.raisetechsns.backend.dto.CreateCommentRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.service.CommentService;

/**
 * {@code /api/posts/{postId}/comments}（一覧取得・作成）と{@code /api/comments/{commentId}}（削除）の
 * 2種類のURLプレフィックスが混在するため、クラスレベルの{@code @RequestMapping}は付けず、
 * メソッドごとにフルパスを指定する。
 */
@RestController
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/api/posts/{postId}/comments")
    public CommentListResponse list(@PathVariable Long postId, @AuthenticationPrincipal User user) {
        return commentService.list(postId, user.getId());
    }

    @PostMapping("/api/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse create(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal User user) {
        return commentService.create(postId, request, user);
    }

    @DeleteMapping("/api/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long commentId, @AuthenticationPrincipal User user) {
        commentService.delete(commentId, user);
    }
}
