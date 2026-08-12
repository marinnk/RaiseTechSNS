package com.raisetechsns.backend.entity;

/**
 * フォロワー一覧・フォロー中一覧の1行分のデータの入れ物（{@code follows}と{@code users}のJOIN結果）。
 */
public class UserFollowSummary {

    private Long id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private boolean followedByMe;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public boolean isFollowedByMe() {
        return followedByMe;
    }

    public void setFollowedByMe(boolean followedByMe) {
        this.followedByMe = followedByMe;
    }
}
