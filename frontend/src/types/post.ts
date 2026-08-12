export interface Post {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isOwnedByMe: boolean;
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
