package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.User;

/**
 * ログイン中利用者の情報。パスワードハッシュなど機微な情報は含めない。
 */
public record AuthUserResponse(
        Long id,
        String username,
        String displayName,
        String email
) {

    public static AuthUserResponse from(User user) {
        return new AuthUserResponse(user.getId(), user.getUsername(), user.getDisplayName(), user.getEmail());
    }
}
