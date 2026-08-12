import { apiGet, apiPost, apiDeleteWithResponse } from './client';
import type { FollowActionResponse, FollowListResponse } from '../types/follow';

export const followUser = (userId: number) => apiPost<FollowActionResponse>(`/api/users/${userId}/follow`, undefined);

export const unfollowUser = (userId: number) => apiDeleteWithResponse<FollowActionResponse>(`/api/users/${userId}/follow`);

export const fetchFollowers = (userId: number) => apiGet<FollowListResponse>(`/api/users/${userId}/followers`);

export const fetchFollowing = (userId: number) => apiGet<FollowListResponse>(`/api/users/${userId}/following`);
