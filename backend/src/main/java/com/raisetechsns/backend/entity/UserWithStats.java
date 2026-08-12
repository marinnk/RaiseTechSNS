package com.raisetechsns.backend.entity;

/**
 * {@code users}の1行に、フォロワー数・フォロー中数・ログイン中利用者がフォロー済みかどうかを
 * あわせ持つデータの入れ物。
 *
 * <p>{@link PostWithAuthor}のいいね数・コメント数と同じ理由で、これらを利用者ごとに個別クエリで
 * 取得すると利用者件数分のクエリが発生する（N+1問題）ため、相関サブクエリ・EXISTSを使い
 * 1回のSELECTでまとめて取得した結果をこの型で受け取る。
 */
public class UserWithStats {

    private Long id;
    private String username;
    private String displayName;
    private String bio;
    private String avatarUrl;
    private long followerCount;
    private long followingCount;
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

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public long getFollowerCount() {
        return followerCount;
    }

    public void setFollowerCount(long followerCount) {
        this.followerCount = followerCount;
    }

    public long getFollowingCount() {
        return followingCount;
    }

    public void setFollowingCount(long followingCount) {
        this.followingCount = followingCount;
    }

    public boolean isFollowedByMe() {
        return followedByMe;
    }

    public void setFollowedByMe(boolean followedByMe) {
        this.followedByMe = followedByMe;
    }
}
