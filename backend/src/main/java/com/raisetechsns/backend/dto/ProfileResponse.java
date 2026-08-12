package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.UserWithStats;

/**
 * プロフィール画面用の利用者情報。パスワード等の機微な情報は含めない。
 */
public record ProfileResponse(
        Long id,
        String username,
        String displayName,
        String bio,
        String avatarUrl,
        long followerCount,
        long followingCount,
        boolean followedByMe,
        boolean isOwnedByMe
) {

    public static ProfileResponse from(UserWithStats row, Long currentUserId) {
        return new ProfileResponse(
                row.getId(),
                row.getUsername(),
                row.getDisplayName(),
                row.getBio(),
                row.getAvatarUrl(),
                row.getFollowerCount(),
                row.getFollowingCount(),
                row.isFollowedByMe(),
                row.getId().equals(currentUserId));
    }
}
