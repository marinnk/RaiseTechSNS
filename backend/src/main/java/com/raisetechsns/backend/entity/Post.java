package com.raisetechsns.backend.entity;

import java.time.LocalDateTime;

/**
 * {@code posts}テーブルの1行に対応するデータの入れ物。
 *
 * <p>{@code id}・{@code createdAt}・{@code updatedAt}はDB側（自動採番・{@code DEFAULT now()}）で
 * 決まる値のため、登録時にJavaのコードから値を設定する必要はない。
 */
public class Post {

    private Long id;
    private Long userId;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

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

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
