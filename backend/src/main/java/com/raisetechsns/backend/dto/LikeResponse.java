package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.PostWithAuthor;

/**
 * いいね登録・解除後の、対象投稿の最新のいいね状態のレスポンス。
 */
public record LikeResponse(long likeCount, boolean likedByMe) {

    public static LikeResponse from(PostWithAuthor row) {
        return new LikeResponse(row.getLikeCount(), row.isLikedByMe());
    }
}
