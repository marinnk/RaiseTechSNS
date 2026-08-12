import { apiGet, apiPost, apiDelete } from './client';
import type { Comment, CommentListResponse, CreateCommentRequest } from '../types/comment';

export const fetchComments = (postId: number) => apiGet<CommentListResponse>(`/api/posts/${postId}/comments`);

export const createComment = (postId: number, payload: CreateCommentRequest) =>
  apiPost<Comment>(`/api/posts/${postId}/comments`, payload);

export const deleteComment = (commentId: number) => apiDelete(`/api/comments/${commentId}`);
