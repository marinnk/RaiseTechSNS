import { apiDeleteWithResponse, apiGet, apiPostMultipart, apiPut } from './client';
import type { Profile, UpdateProfileRequest } from '../types/profile';

export const fetchProfile = (userId: number) => apiGet<Profile>(`/api/users/${userId}`);

export const updateMyProfile = (payload: UpdateProfileRequest) => apiPut<Profile>('/api/users/me', payload);

export const uploadMyAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiPostMultipart<Profile>('/api/users/me/avatar', formData);
};

export const deleteMyAvatar = () => apiDeleteWithResponse<Profile>('/api/users/me/avatar');
