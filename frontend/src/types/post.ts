export interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isOwnedByMe: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface PostListResponse {
  posts: Post[];
  hasMore: boolean;
}

export interface CreatePostRequest {
  content: string;
}

export interface UpdatePostRequest {
  content: string;
}
