import { apiPost, apiDeleteWithResponse } from './client';
import type { LikeResponse } from '../types/like';

export const likePost = (postId: number) => apiPost<LikeResponse>(`/api/posts/${postId}/likes`, undefined);

export const unlikePost = (postId: number) => apiDeleteWithResponse<LikeResponse>(`/api/posts/${postId}/likes`);
