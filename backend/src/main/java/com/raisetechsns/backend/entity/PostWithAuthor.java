package com.raisetechsns.backend.entity;

import java.time.OffsetDateTime;

/**
 * {@code posts}と{@code users}をJOINした1行分のデータの入れ物。
 *
 * <p>タイムラインの一覧・単体取得では投稿者の表示名・ユーザー名も必要になるため、
 * N+1クエリを避けて1回のSELECTでまとめて取得した結果をこの型で受け取る。
 *
 * <p>{@code createdAt}・{@code updatedAt}はDB側でTIMESTAMPTZ（タイムゾーン付き）として保存されており、
 * サーバー・ブラウザのタイムゾーン設定に依存せず日時を一意に特定できるよう{@link OffsetDateTime}で扱う。
 */
public class PostWithAuthor {

    private Long postId;
    private Long userId;
    private String content;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private String username;
    private String displayName;

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

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}
