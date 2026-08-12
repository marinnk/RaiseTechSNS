package com.raisetechsns.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePostRequest(
        @NotBlank(message = "content must not be blank")
        @Size(max = 280, message = "content must be 280 characters or less")
        String content
) {
}
