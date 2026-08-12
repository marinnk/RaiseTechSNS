package com.raisetechsns.backend.dto;

import java.util.List;

/**
 * 投稿一覧のレスポンス。{@code hasMore}は{@code beforeId}によるページングでのみ意味を持ち、
 * {@code afterId}によるポーリング（新着差分取得）では利用しない。
 */
public record PostListResponse(List<PostResponse> posts, boolean hasMore) {
}
