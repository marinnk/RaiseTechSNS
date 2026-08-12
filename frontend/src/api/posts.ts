import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Post, PostListResponse, CreatePostRequest, UpdatePostRequest } from '../types/post';

interface FetchPostsParams {
  limit?: number;
  beforeId?: number;
  afterId?: number;
}

export function fetchPosts({ limit, beforeId, afterId }: FetchPostsParams = {}) {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (beforeId !== undefined) params.set('beforeId', String(beforeId));
  if (afterId !== undefined) params.set('afterId', String(afterId));
  const query = params.toString();
  return apiGet<PostListResponse>(`/api/posts${query ? `?${query}` : ''}`);
}

export const createPost = (payload: CreatePostRequest) => apiPost<Post>('/api/posts', payload);

export const updatePost = (postId: number, payload: UpdatePostRequest) =>
  apiPut<Post>(`/api/posts/${postId}`, payload);

export const deletePost = (postId: number) => apiDelete(`/api/posts/${postId}`);
