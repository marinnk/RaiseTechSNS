import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from './useProfile';
import { deleteMyAvatar, fetchProfile, updateMyProfile, uploadMyAvatar } from '../api/profile';
import type { Profile } from '../types/profile';

vi.mock('../api/profile');

const mockFetchProfile = vi.mocked(fetchProfile);
const mockUpdateMyProfile = vi.mocked(updateMyProfile);
const mockUploadMyAvatar = vi.mocked(uploadMyAvatar);
const mockDeleteMyAvatar = vi.mocked(deleteMyAvatar);

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 1,
    username: 'taro',
    displayName: '太郎',
    bio: null,
    avatarUrl: null,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isOwnedByMe: true,
    ...overrides,
  };
}

describe('useProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('userIdがnullの間はフェッチしない', () => {
    const { result } = renderHook(() => useProfile(null));

    expect(result.current.profile).toBeNull();
    expect(mockFetchProfile).not.toHaveBeenCalled();
  });

  it('userIdが設定されるとプロフィールを取得する', async () => {
    mockFetchProfile.mockResolvedValue(profile());
    const { result } = renderHook(() => useProfile(1));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual(profile());
    expect(mockFetchProfile).toHaveBeenCalledWith(1);
  });

  it('取得に失敗するとerrorが設定される', async () => {
    mockFetchProfile.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useProfile(1));

    await waitFor(() => expect(result.current.error).toBe('プロフィールの取得に失敗しました。'));
  });

  it('userIdがnullに戻るとprofileとerrorがリセットされる', async () => {
    mockFetchProfile.mockResolvedValue(profile());
    const { result, rerender } = renderHook(({ userId }) => useProfile(userId), {
      initialProps: { userId: 1 as number | null },
    });
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    rerender({ userId: null });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('applyProfileUpdateは既存のprofileに部分的な更新を反映する', async () => {
    mockFetchProfile.mockResolvedValue(profile());
    const { result } = renderHook(() => useProfile(1));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    act(() => {
      result.current.applyProfileUpdate({ followedByMe: true, followerCount: 1 });
    });

    expect(result.current.profile).toEqual(profile({ followedByMe: true, followerCount: 1 }));
  });

  it('saveBioが成功するとprofileが更新されtrueを返す', async () => {
    mockFetchProfile.mockResolvedValue(profile({ bio: null }));
    mockUpdateMyProfile.mockResolvedValue(profile({ bio: 'よろしくお願いします' }));
    const { result } = renderHook(() => useProfile(1));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    let success = false;
    await act(async () => {
      success = await result.current.saveBio('よろしくお願いします');
    });

    expect(success).toBe(true);
    expect(result.current.profile?.bio).toBe('よろしくお願いします');
    expect(result.current.savingBio).toBe(false);
  });

  it('saveBioが失敗するとerrorが設定されfalseを返す', async () => {
    mockFetchProfile.mockResolvedValue(profile());
    mockUpdateMyProfile.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useProfile(1));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    let success = true;
    await act(async () => {
      success = await result.current.saveBio('失敗するはず');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('プロフィールの更新に失敗しました。');
  });

  it('uploadAvatarが成功するとprofileが更新されonOwnAvatarChangeが呼ばれる', async () => {
    const onOwnAvatarChange = vi.fn();
    mockFetchProfile.mockResolvedValue(profile({ avatarUrl: null }));
    mockUploadMyAvatar.mockResolvedValue(profile({ avatarUrl: 'https://example.com/avatars/new.jpg' }));
    const { result } = renderHook(() => useProfile(1, onOwnAvatarChange));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    let success = false;
    await act(async () => {
      success = await result.current.uploadAvatar(new File(['dummy'], 'a.jpg', { type: 'image/jpeg' }));
    });

    expect(success).toBe(true);
    expect(result.current.profile?.avatarUrl).toBe('https://example.com/avatars/new.jpg');
    expect(onOwnAvatarChange).toHaveBeenCalledWith('https://example.com/avatars/new.jpg');
  });

  it('uploadAvatarが失敗するとerrorが設定されonOwnAvatarChangeは呼ばれない', async () => {
    const onOwnAvatarChange = vi.fn();
    mockFetchProfile.mockResolvedValue(profile());
    mockUploadMyAvatar.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useProfile(1, onOwnAvatarChange));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    let success = true;
    await act(async () => {
      success = await result.current.uploadAvatar(new File(['dummy'], 'a.jpg', { type: 'image/jpeg' }));
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('プロフィール画像の更新に失敗しました。');
    expect(onOwnAvatarChange).not.toHaveBeenCalled();
  });

  it('removeAvatarが成功するとprofileが更新されonOwnAvatarChangeが呼ばれる', async () => {
    const onOwnAvatarChange = vi.fn();
    mockFetchProfile.mockResolvedValue(profile({ avatarUrl: 'https://example.com/avatars/old.jpg' }));
    mockDeleteMyAvatar.mockResolvedValue(profile({ avatarUrl: null }));
    const { result } = renderHook(() => useProfile(1, onOwnAvatarChange));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    let success = false;
    await act(async () => {
      success = await result.current.removeAvatar();
    });

    expect(success).toBe(true);
    expect(result.current.profile?.avatarUrl).toBeNull();
    expect(onOwnAvatarChange).toHaveBeenCalledWith(null);
  });

  it('removeAvatarが失敗するとerrorが設定される', async () => {
    mockFetchProfile.mockResolvedValue(profile());
    mockDeleteMyAvatar.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useProfile(1));
    await waitFor(() => expect(result.current.profile).not.toBeNull());

    await act(async () => {
      await result.current.removeAvatar();
    });

    expect(result.current.error).toBe('プロフィール画像の削除に失敗しました。');
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockFetchProfile.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useProfile(1));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
