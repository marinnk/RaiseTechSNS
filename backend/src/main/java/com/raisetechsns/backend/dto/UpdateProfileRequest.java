package com.raisetechsns.backend.dto;

import jakarta.validation.constraints.Size;

/**
 * 自己紹介の更新リクエスト。アイコン画像は{@code POST/DELETE /api/users/me/avatar}という
 * 別のmultipart/form-dataエンドポイントで扱うため、このDTOには含めない。空文字（自己紹介の
 * クリア）は許容するため{@code @NotBlank}は付けない。
 */
public record UpdateProfileRequest(
        @Size(max = 160, message = "bio must be 160 characters or less")
        String bio
) {
}
