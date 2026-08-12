export interface UserSummary {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followedByMe: boolean;
}

export interface FollowListResponse {
  users: UserSummary[];
}

export interface FollowActionResponse {
  followedByMe: boolean;
  followerCount: number;
}
