package com.raisetechsns.backend.dto;

import jakarta.validation.constraints.Size;

/**
 * 自己紹介の更新リクエスト。今バージョンでは自己紹介のみ編集可能とし、アイコン画像の
 * アップロード（S3連携）は別Issueで対応する。空文字（自己紹介のクリア）は許容するため
 * {@code @NotBlank}は付けない。
 */
public record UpdateProfileRequest(
        @Size(max = 160, message = "bio must be 160 characters or less")
        String bio
) {
}
