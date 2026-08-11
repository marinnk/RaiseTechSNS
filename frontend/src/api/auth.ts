import { apiGet, apiPost, apiPostNoContent } from './client';
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth';

export const registerUser = (payload: RegisterRequest) => apiPost<AuthUser>('/api/auth/register', payload);

export const loginUser = (payload: LoginRequest) => apiPost<AuthUser>('/api/auth/login', payload);

export const logoutUser = () => apiPostNoContent('/api/auth/logout');

export const getCurrentUser = () => apiGet<AuthUser>('/api/auth/me');
