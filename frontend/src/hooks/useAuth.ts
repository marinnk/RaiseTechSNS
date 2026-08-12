import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../api/auth';
import type { AuthUser, LoginRequest, RegisterRequest } from '../types/auth';

type SessionStatus = 'checking' | 'ready';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // マウント時に、既存のセッション（Cookie）が有効かどうかを確認する。
  // アクセストークンが切れていてもリフレッシュトークンが有効ならapi/client.tsが自動で
  // リフレッシュを試みるため、ここでの401は「本当に未ログイン」の場合のみになる
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) {
          console.error(err);
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setSessionStatus('ready');
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload: LoginRequest): Promise<boolean> => {
    setError(null);
    setSubmitting(true);
    try {
      const loggedInUser = await loginUser(payload);
      setUser(loggedInUser);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ログインに失敗しました。通信環境を確認してください。');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterRequest): Promise<boolean> => {
    setError(null);
    setSubmitting(true);
    try {
      const registeredUser = await registerUser(payload);
      setUser(registeredUser);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登録に失敗しました。通信環境を確認してください。');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setSubmitting(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      setSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { user, sessionStatus, submitting, error, login, register, logout, clearError };
}
