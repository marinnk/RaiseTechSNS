export interface Comment {
  id: number;
  postId: number;
  userId: number;
  username: string;
  displayName: string;
  content: string;
  isOwnedByMe: boolean;
}

export interface CommentListResponse {
  comments: Comment[];
}

export interface CreateCommentRequest {
  content: string;
}
