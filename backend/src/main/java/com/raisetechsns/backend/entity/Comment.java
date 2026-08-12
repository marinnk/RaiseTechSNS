package com.raisetechsns.backend.entity;

import java.time.LocalDateTime;

/**
 * {@code comments}テーブルの1行に対応するデータの入れ物。
 *
 * <p>{@code id}・{@code createdAt}はDB側（自動採番・{@code DEFAULT now()}）で決まる値のため、
 * 登録時にJavaのコードから値を設定する必要はない。
 *
 * <p>{@code created_at}列はTIMESTAMPTZではなくTIMESTAMPのまま（{@link LocalDateTime}）で扱う。
 * 現状フロントエンドでコメントの日時を表示しないため、{@code posts}のような
 * タイムゾーン対応は不要（{@code docs/basic-design.md}参照）。
 */
public class Comment {

    private Long id;
    private Long postId;
    private Long userId;
    private String content;
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
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
}
