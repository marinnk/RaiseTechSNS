package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.UserWithStats;

/**
 * フォロー登録・解除後の、対象利用者の最新のフォロー状態のレスポンス。
 */
public record FollowActionResponse(boolean followedByMe, long followerCount) {

    public static FollowActionResponse from(UserWithStats row) {
        return new FollowActionResponse(row.isFollowedByMe(), row.getFollowerCount());
    }
}
