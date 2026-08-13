package com.raisetechsns.backend.entity;

/**
 * {@code post_images}テーブルの1行に対応するデータの入れ物。
 *
 * <p>{@code createdAt}はAPIレスポンスでも並び替えでも使わないため、フィールドとして持たない。
 */
public class PostImage {

    private Long id;
    private Long postId;
    private String imageUrl;
    private int displayOrder;

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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }
}
