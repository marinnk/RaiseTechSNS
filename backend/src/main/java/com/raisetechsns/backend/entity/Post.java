package com.raisetechsns.backend.entity;

import java.time.OffsetDateTime;

/**
 * {@code posts}テーブルの1行に対応するデータの入れ物。
 *
 * <p>{@code id}・{@code createdAt}・{@code updatedAt}はDB側（自動採番・{@code DEFAULT now()}）で
 * 決まる値のため、登録時にJavaのコードから値を設定する必要はない。
 *
 * <p>{@code createdAt}・{@code updatedAt}はDB側でTIMESTAMPTZ（タイムゾーン付き）として保存されており、
 * サーバー・ブラウザのタイムゾーン設定に依存せず日時を一意に特定できるよう{@link OffsetDateTime}で扱う。
 */
public class Post {

    private Long id;
    private Long userId;
    private String content;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
