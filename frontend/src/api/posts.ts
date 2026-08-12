import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Post, PostListResponse, CreatePostRequest, UpdatePostRequest } from '../types/post';

interface FetchPostsParams {
  limit?: number;
  beforeId?: number;
  afterId?: number;
  // 指定した利用者の投稿のみに絞り込む（プロフィール画面の投稿一覧用）
  userId?: number;
  // 'following'を指定するとフォロー中の利用者（および自分自身）の投稿のみに絞り込む
  // （タイムラインの「フォロー中」タブ用）。省略時はバックエンド側で絞り込みなし（全体）として扱われる
  scope?: 'following';
}

export function fetchPosts({ limit, beforeId, afterId, userId, scope }: FetchPostsParams = {}) {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (beforeId !== undefined) params.set('beforeId', String(beforeId));
  if (afterId !== undefined) params.set('afterId', String(afterId));
  if (userId !== undefined) params.set('userId', String(userId));
  if (scope !== undefined) params.set('scope', scope);
  const query = params.toString();
  return apiGet<PostListResponse>(`/api/posts${query ? `?${query}` : ''}`);
}

export const createPost = (payload: CreatePostRequest) => apiPost<Post>('/api/posts', payload);

export const updatePost = (postId: number, payload: UpdatePostRequest) =>
  apiPut<Post>(`/api/posts/${postId}`, payload);

export const deletePost = (postId: number) => apiDelete(`/api/posts/${postId}`);
