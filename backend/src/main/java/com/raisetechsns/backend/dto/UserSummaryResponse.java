package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.UserFollowSummary;

/**
 * フォロワー一覧・フォロー中一覧の1件分のレスポンス。
 */
public record UserSummaryResponse(
        Long id,
        String username,
        String displayName,
        String avatarUrl,
        boolean followedByMe
) {

    public static UserSummaryResponse from(UserFollowSummary row) {
        return new UserSummaryResponse(
                row.getId(), row.getUsername(), row.getDisplayName(), row.getAvatarUrl(), row.isFollowedByMe());
    }
}
