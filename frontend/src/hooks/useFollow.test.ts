import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFollow } from './useFollow';
import { ApiError } from '../api/client';
import { followUser, unfollowUser } from '../api/follows';

vi.mock('../api/follows');

const mockFollowUser = vi.mocked(followUser);
const mockUnfollowUser = vi.mocked(unfollowUser);

describe('useFollow', () => {
  const applyProfileUpdate = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('未フォローの相手をtoggleFollowすると、楽観的更新の後サーバー値で確定する', async () => {
    mockFollowUser.mockResolvedValue({ followedByMe: true, followerCount: 3 });
    const { result } = renderHook(() => useFollow(applyProfileUpdate, 2));

    await act(async () => {
      await result.current.toggleFollow({ id: 2, followedByMe: false, followerCount: 2 });
    });

    expect(applyProfileUpdate).toHaveBeenNthCalledWith(1, { followedByMe: true, followerCount: 3 });
    expect(applyProfileUpdate).toHaveBeenNthCalledWith(2, { followedByMe: true, followerCount: 3 });
    expect(mockFollowUser).toHaveBeenCalledWith(2);
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('フォロー済みの相手をtoggleFollowすると解除APIが呼ばれる', async () => {
    mockUnfollowUser.mockResolvedValue({ followedByMe: false, followerCount: 1 });
    const { result } = renderHook(() => useFollow(applyProfileUpdate, 2));

    await act(async () => {
      await result.current.toggleFollow({ id: 2, followedByMe: true, followerCount: 2 });
    });

    expect(mockUnfollowUser).toHaveBeenCalledWith(2);
    expect(mockFollowUser).not.toHaveBeenCalled();
  });

  it('APIが失敗すると元の状態にロールバックしerrorが設定される', async () => {
    mockFollowUser.mockRejectedValue(new ApiError(500, 'フォローに失敗しました（サーバー）'));
    const { result } = renderHook(() => useFollow(applyProfileUpdate, 2));

    await act(async () => {
      await result.current.toggleFollow({ id: 2, followedByMe: false, followerCount: 2 });
    });

    expect(applyProfileUpdate).toHaveBeenNthCalledWith(1, { followedByMe: true, followerCount: 3 });
    expect(applyProfileUpdate).toHaveBeenNthCalledWith(2, { followedByMe: false, followerCount: 2 });
    expect(result.current.error).toBe('フォローに失敗しました（サーバー）');
  });

  it('ApiError以外での失敗時はフォールバックメッセージがerrorに設定される', async () => {
    mockFollowUser.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useFollow(applyProfileUpdate, 2));

    await act(async () => {
      await result.current.toggleFollow({ id: 2, followedByMe: false, followerCount: 2 });
    });

    expect(result.current.error).toBe('フォロー処理に失敗しました。');
  });

  it('レスポンス待ちの間に別の利用者のプロフィールへ遷移していたら、その利用者のprofileは書き換えない', async () => {
    let resolveFollow: (res: { followedByMe: boolean; followerCount: number }) => void = () => {};
    mockFollowUser.mockReturnValue(
      new Promise((resolve) => {
        resolveFollow = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ currentProfileUserId }) => useFollow(applyProfileUpdate, currentProfileUserId),
      { initialProps: { currentProfileUserId: 2 } },
    );

    let togglePromise!: Promise<void>;
    act(() => {
      togglePromise = result.current.toggleFollow({ id: 2, followedByMe: false, followerCount: 2 });
    });
    applyProfileUpdate.mockClear();

    // レスポンス待ちの間に別の利用者のプロフィールへ遷移する
    rerender({ currentProfileUserId: 3 });

    await act(async () => {
      resolveFollow({ followedByMe: true, followerCount: 3 });
      await togglePromise;
    });

    expect(applyProfileUpdate).not.toHaveBeenCalled();
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockFollowUser.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useFollow(applyProfileUpdate, 2));
    await act(async () => {
      await result.current.toggleFollow({ id: 2, followedByMe: false, followerCount: 2 });
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
