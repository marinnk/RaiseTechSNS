package com.raisetechsns.backend.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdatePostRequest(
        @NotBlank(message = "content must not be blank")
        @Size(max = 280, message = "content must be 280 characters or less")
        String content,

        // 編集後も残す既存画像のid。省略不可（必ず配列を送る）とすることで、フロントエンドが
        // フィールドを送り忘れて既存画像がすべて削除される事故を防ぐ。既存画像を全て消す場合は
        // 空配列を送る
        @NotNull(message = "keepImageIds must not be null")
        List<Long> keepImageIds
) {
}
