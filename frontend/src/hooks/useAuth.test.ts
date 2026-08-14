import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';
import { ApiError } from '../api/client';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../api/auth';
import type { AuthUser } from '../types/auth';

vi.mock('../api/auth');

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockLoginUser = vi.mocked(loginUser);
const mockLogoutUser = vi.mocked(logoutUser);
const mockRegisterUser = vi.mocked(registerUser);

const user: AuthUser = {
  id: 1,
  username: 'taro',
  displayName: '太郎',
  email: 'taro@example.com',
  avatarUrl: null,
};

describe('useAuth', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('マウント時にセッションが有効ならuserが設定されsessionStatusがreadyになる', async () => {
    mockGetCurrentUser.mockResolvedValue(user);

    const { result } = renderHook(() => useAuth());
    expect(result.current.sessionStatus).toBe('checking');

    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));
    expect(result.current.user).toEqual(user);
  });

  it('マウント時のセッション確認が401（未ログイン）で失敗した場合はconsole.errorを呼ばずuserがnullになる', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));
    expect(result.current.user).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('マウント時のセッション確認が401以外のエラーで失敗した場合はconsole.errorを呼ぶ', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));
    expect(result.current.user).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('loginが成功するとuserが設定されtrueを返す', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    mockLoginUser.mockResolvedValue(user);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));

    let success = false;
    await act(async () => {
      success = await result.current.login({ email: 'taro@example.com', password: 'password' });
    });

    expect(success).toBe(true);
    expect(result.current.user).toEqual(user);
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loginがApiErrorで失敗するとそのmessageがerrorに設定されfalseを返す', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    mockLoginUser.mockRejectedValue(new ApiError(401, 'メールアドレスまたはパスワードが正しくありません。'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));

    let success = true;
    await act(async () => {
      success = await result.current.login({ email: 'taro@example.com', password: 'wrong' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('メールアドレスまたはパスワードが正しくありません。');
    expect(result.current.user).toBeNull();
  });

  it('loginがApiError以外で失敗するとフォールバックメッセージがerrorに設定される', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    mockLoginUser.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));

    await act(async () => {
      await result.current.login({ email: 'taro@example.com', password: 'password' });
    });

    expect(result.current.error).toBe('ログインに失敗しました。通信環境を確認してください。');
  });

  it('registerが成功するとuserが設定されtrueを返す', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    mockRegisterUser.mockResolvedValue(user);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));

    let success = false;
    await act(async () => {
      success = await result.current.register({ username: 'taro', email: 'taro@example.com', password: 'password' });
    });

    expect(success).toBe(true);
    expect(result.current.user).toEqual(user);
  });

  it('registerがApiError以外で失敗するとフォールバックメッセージがerrorに設定されfalseを返す', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    mockRegisterUser.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));

    let success = true;
    await act(async () => {
      success = await result.current.register({ username: 'taro', email: 'taro@example.com', password: 'password' });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('登録に失敗しました。通信環境を確認してください。');
  });

  it('logoutが成功するとuserがnullになる', async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockLogoutUser.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).toEqual(user));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it('logoutが失敗してもconsole.errorを呼びつつuserはnullになる（ログアウト自体は諦めない）', async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockLogoutUser.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).toEqual(user));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    mockLoginUser.mockRejectedValue(new ApiError(401, '認証エラー'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));
    await act(async () => {
      await result.current.login({ email: 'taro@example.com', password: 'wrong' });
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('updateAvatarUrlはログイン中のuserのavatarUrlのみ更新する', async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).toEqual(user));

    act(() => {
      result.current.updateAvatarUrl('https://example.com/avatars/new.jpg');
    });

    expect(result.current.user?.avatarUrl).toBe('https://example.com/avatars/new.jpg');
  });

  it('未ログイン状態でupdateAvatarUrlを呼んでもuserはnullのまま', async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.sessionStatus).toBe('ready'));

    act(() => {
      result.current.updateAvatarUrl('https://example.com/avatars/new.jpg');
    });

    expect(result.current.user).toBeNull();
  });
});
