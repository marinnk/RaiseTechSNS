package com.raisetechsns.backend.dto;

import java.util.List;

/**
 * 指定した投稿のコメント一覧のレスポンス。古い順（{@code id ASC}）に並ぶ。
 */
public record CommentListResponse(List<CommentResponse> comments) {
}
