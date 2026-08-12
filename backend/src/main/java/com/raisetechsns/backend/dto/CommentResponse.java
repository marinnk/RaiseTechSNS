package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.CommentWithAuthor;

/**
 * 投稿詳細でのコメント一覧表示用の1件分のレスポンス。
 */
public record CommentResponse(
        Long id,
        Long postId,
        Long userId,
        String username,
        String displayName,
        String content,
        boolean isOwnedByMe
) {

    public static CommentResponse from(CommentWithAuthor row, Long currentUserId) {
        return new CommentResponse(
                row.getCommentId(),
                row.getPostId(),
                row.getUserId(),
                row.getUsername(),
                row.getDisplayName(),
                row.getContent(),
                row.getUserId().equals(currentUserId));
    }
}
