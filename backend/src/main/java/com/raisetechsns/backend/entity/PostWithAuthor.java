package com.raisetechsns.backend.entity;

import java.time.OffsetDateTime;

/**
 * {@code posts}と{@code users}をJOINした1行分のデータの入れ物。
 *
 * <p>タイムラインの一覧・単体取得では投稿者の表示名・ユーザー名に加えて、いいね数・コメント数・
 * ログイン中の利用者がいいね済みかどうかも必要になる。これらを投稿ごとに個別クエリで取得すると
 * 投稿件数分のクエリが発生する（N+1問題）ため、相関サブクエリを使って1回のSELECTでまとめて
 * 取得した結果をこの型で受け取る。
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
    private String avatarUrl;
    private long likeCount;
    private long commentCount;
    private boolean likedByMe;

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

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(long likeCount) {
        this.likeCount = likeCount;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(long commentCount) {
        this.commentCount = commentCount;
    }

    public boolean isLikedByMe() {
        return likedByMe;
    }

    public void setLikedByMe(boolean likedByMe) {
        this.likedByMe = likedByMe;
    }
}
