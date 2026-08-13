package com.raisetechsns.backend.dto;

import java.util.List;

/**
 * ユーザー検索結果のレスポンス。{@link FollowListResponse}と同じ形。
 */
public record UserSearchResponse(List<UserSummaryResponse> users) {
}
