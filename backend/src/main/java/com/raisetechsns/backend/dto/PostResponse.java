package com.raisetechsns.backend.dto;

import java.time.LocalDateTime;

import com.raisetechsns.backend.entity.PostWithAuthor;

/**
 * タイムライン表示用の投稿1件分のレスポンス。パスワード等の機微な情報は含めない。
 */
public record PostResponse(
        Long id,
        Long userId,
        String username,
        String displayName,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean isOwnedByMe
) {

    public static PostResponse from(PostWithAuthor row, Long currentUserId) {
        return new PostResponse(
                row.getPostId(),
                row.getUserId(),
                row.getUsername(),
                row.getDisplayName(),
                row.getContent(),
                row.getCreatedAt(),
                row.getUpdatedAt(),
                row.getUserId().equals(currentUserId));
    }
}
