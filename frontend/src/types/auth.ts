export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
