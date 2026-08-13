// ユーザー検索（F-8 / S07）の結果1件分。バックエンドのUserSummaryResponseと同じ形だが、
// フォロー一覧（types/follow.ts）とは意味が異なる機能のため、検索機能として意味の通る型名にしている。
export interface UserSearchResult {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followedByMe: boolean;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
}
