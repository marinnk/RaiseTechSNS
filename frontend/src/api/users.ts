import { apiGet } from './client';
import type { UserSearchResponse } from '../types/user';

export const searchUsers = (keyword: string) =>
  apiGet<UserSearchResponse>(`/api/users?q=${encodeURIComponent(keyword)}`);
