package com.raisetechsns.backend.entity;

/**
 * {@code comments}と{@code users}をJOINした1行分のデータの入れ物。
 *
 * <p>投稿詳細でのコメント一覧表示では、コメント者の表示名・ユーザー名も必要になる。
 * {@link PostWithAuthor}と同じ理由で、コメントごとに投稿者情報を個別クエリで取得すると
 * コメント件数分のクエリが発生する（N+1問題）ため、JOINして1回のSELECTでまとめて
 * 取得した結果をこの型で受け取る。
 *
 * <p>画面設計上コメントの投稿日時は表示しないため、{@code createdAt}はあえて含めない。
 */
public class CommentWithAuthor {

    private Long commentId;
    private Long postId;
    private Long userId;
    private String content;
    private String username;
    private String displayName;

    public Long getCommentId() {
        return commentId;
    }

    public void setCommentId(Long commentId) {
        this.commentId = commentId;
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
