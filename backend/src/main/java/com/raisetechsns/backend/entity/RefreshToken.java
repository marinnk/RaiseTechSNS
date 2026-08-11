package com.raisetechsns.backend.entity;

import java.time.LocalDateTime;

/**
 * {@code refresh_tokens}テーブルの1行に対応するデータの入れ物。
 *
 * <p>{@code tokenHash}にはトークンの生の値ではなく、SHA-256でハッシュ化した値を保持する。
 * {@code id}・{@code createdAt}はDB側（自動採番・{@code DEFAULT now()}）で決まる値のため、
 * 発行時にJavaのコードから値を設定する必要はない。
 */
public class RefreshToken {

    private Long id;
    private Long userId;
    private String tokenHash;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String tokenHash) {
        this.tokenHash = tokenHash;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
