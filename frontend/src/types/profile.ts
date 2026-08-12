export interface Profile {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
  isOwnedByMe: boolean;
}

export interface UpdateProfileRequest {
  bio: string;
}
