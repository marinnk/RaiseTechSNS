package com.raisetechsns.backend.validation;

import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * アップロード画像（プロフィール画像・将来の投稿画像）に共通する形式・サイズのバリデーション。
 */
public final class ImageValidation {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;

    private ImageValidation() {
    }

    /**
     * 画像として妥当かどうかを検証する。空、jpg/png以外の形式、5MB超のいずれかに該当する場合は
     * {@link ResponseStatusException}（400 BAD_REQUEST）を投げる。
     */
    public static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "image must not be empty");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "image must be jpg or png");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "image must be 5MB or less");
        }
    }
}
