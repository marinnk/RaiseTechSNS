package com.raisetechsns.backend.dto;

import com.raisetechsns.backend.entity.PostImage;

/**
 * 投稿1件分のレスポンスに含める画像1枚分。
 */
public record PostImageResponse(Long id, String imageUrl) {

    public static PostImageResponse from(PostImage image) {
        return new PostImageResponse(image.getId(), image.getImageUrl());
    }
}
