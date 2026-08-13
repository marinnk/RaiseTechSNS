package com.raisetechsns.backend.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

class ImageValidationTest {

    @Test
    void validate_jpgかつ5MB以下なら例外を投げない() {
        MultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[100]);

        ImageValidation.validate(file);

        // 例外が発生しなければ成功
    }

    @Test
    void validate_pngかつ5MB以下なら例外を投げない() {
        MultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[100]);

        ImageValidation.validate(file);

        // 例外が発生しなければ成功
    }

    @Test
    void validate_空のファイルはBAD_REQUESTになる() {
        MultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[0]);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> ImageValidation.validate(file));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void validate_jpg_png以外の形式はBAD_REQUESTになる() {
        MultipartFile file = new MockMultipartFile("file", "note.txt", "text/plain", new byte[10]);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> ImageValidation.validate(file));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void validate_Content_Typeが送られていない場合もNPEにならずBAD_REQUESTになる() {
        // クライアントがContent-Typeを送らなかった場合、MultipartFile#getContentType()はnullを返す。
        // ALLOWED_CONTENT_TYPESはSet.of(...)によるイミュータブルなSetのため、containsに直接nullを
        // 渡すとNullPointerExceptionになる（品質チェックで判明した不具合の再発防止用テスト）
        MultipartFile file = new MockMultipartFile("file", "avatar.jpg", null, new byte[100]);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> ImageValidation.validate(file));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void validate_5MBを超える場合はBAD_REQUESTになる() {
        MultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[6 * 1024 * 1024]);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> ImageValidation.validate(file));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
