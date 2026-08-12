import { apiGet, apiPut } from './client';
import type { Profile, UpdateProfileRequest } from '../types/profile';

export const fetchProfile = (userId: number) => apiGet<Profile>(`/api/users/${userId}`);

export const updateMyProfile = (payload: UpdateProfileRequest) => apiPut<Profile>('/api/users/me', payload);
