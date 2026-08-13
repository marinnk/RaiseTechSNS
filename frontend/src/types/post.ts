export interface PostImage {
  id: number;
  imageUrl: string;
}

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
  images: PostImage[];
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
  // 編集後も残す既存画像のid。バックエンドは必須項目として扱う（省略不可）
  keepImageIds: number[];
}
