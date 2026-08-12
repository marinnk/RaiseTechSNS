package com.raisetechsns.backend.dto;

import java.util.List;

/**
 * フォロワー一覧・フォロー中一覧のレスポンス。
 */
public record FollowListResponse(List<UserSummaryResponse> users) {
}
