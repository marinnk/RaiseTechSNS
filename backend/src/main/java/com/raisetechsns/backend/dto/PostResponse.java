package com.raisetechsns.backend.dto;

import java.time.OffsetDateTime;

import com.raisetechsns.backend.entity.PostWithAuthor;

/**
 * タイムライン表示用の投稿1件分のレスポンス。パスワード等の機微な情報は含めない。
 *
 * <p>{@code createdAt}・{@code updatedAt}は{@link OffsetDateTime}のため、JSONにはタイムゾーンオフセット
 * 付きのISO8601文字列（例：{@code 2026-08-10T12:34:56.789Z}）としてシリアライズされる。
 * サーバー・ブラウザのタイムゾーンが異なっても、フロントエンドの{@code new Date(isoString)}が
 * オフセットを見て正しい日時に解釈できる。
 */
public record PostResponse(
        Long id,
        Long userId,
        String username,
        String displayName,
        String content,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean isOwnedByMe,
        long likeCount,
        long commentCount,
        boolean likedByMe
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
                row.getUserId().equals(currentUserId),
                row.getLikeCount(),
                row.getCommentCount(),
                row.isLikedByMe());
    }
}
