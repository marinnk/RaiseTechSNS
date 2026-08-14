import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLikes } from './useLikes';
import { ApiError } from '../api/client';
import { likePost, unlikePost } from '../api/likes';
import type { Post } from '../types/post';

vi.mock('../api/likes');

const mockLikePost = vi.mocked(likePost);
const mockUnlikePost = vi.mocked(unlikePost);

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    userId: 1,
    username: 'taro',
    displayName: '太郎',
    avatarUrl: null,
    content: '投稿本文',
    createdAt: '2026-08-10T10:00:00',
    updatedAt: '2026-08-10T10:00:00',
    isOwnedByMe: true,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    images: [],
    ...overrides,
  };
}

describe('useLikes', () => {
  const applyLikeUpdate = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('未いいねの投稿をtoggleLikeすると、楽観的更新の後サーバー値で確定する', async () => {
    mockLikePost.mockResolvedValue({ likeCount: 1, likedByMe: true });
    const { result } = renderHook(() => useLikes(applyLikeUpdate));

    await act(async () => {
      await result.current.toggleLike(post({ id: 1, likeCount: 0, likedByMe: false }));
    });

    expect(applyLikeUpdate).toHaveBeenNthCalledWith(1, 1, { likeCount: 1, likedByMe: true });
    expect(applyLikeUpdate).toHaveBeenNthCalledWith(2, 1, { likeCount: 1, likedByMe: true });
    expect(mockLikePost).toHaveBeenCalledWith(1);
    expect(mockUnlikePost).not.toHaveBeenCalled();
  });

  it('いいね済みの投稿をtoggleLikeすると解除APIが呼ばれる', async () => {
    mockUnlikePost.mockResolvedValue({ likeCount: 0, likedByMe: false });
    const { result } = renderHook(() => useLikes(applyLikeUpdate));

    await act(async () => {
      await result.current.toggleLike(post({ id: 1, likeCount: 1, likedByMe: true }));
    });

    expect(mockUnlikePost).toHaveBeenCalledWith(1);
  });

  it('APIが失敗すると元の状態にロールバックしerrorが設定される', async () => {
    mockLikePost.mockRejectedValue(new ApiError(500, 'いいねに失敗しました（サーバー）'));
    const { result } = renderHook(() => useLikes(applyLikeUpdate));

    await act(async () => {
      await result.current.toggleLike(post({ id: 1, likeCount: 0, likedByMe: false }));
    });

    expect(applyLikeUpdate).toHaveBeenNthCalledWith(2, 1, { likeCount: 0, likedByMe: false });
    expect(result.current.error).toBe('いいねに失敗しました（サーバー）');
  });

  it('ApiError以外での失敗時はフォールバックメッセージがerrorに設定される', async () => {
    mockLikePost.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useLikes(applyLikeUpdate));

    await act(async () => {
      await result.current.toggleLike(post({ id: 1, likeCount: 0, likedByMe: false }));
    });

    expect(result.current.error).toBe('いいねの処理に失敗しました。');
  });

  it('isTogglingは処理中のpostIdに対してtrueを返す', async () => {
    let resolveLike: (res: { likeCount: number; likedByMe: boolean }) => void = () => {};
    mockLikePost.mockReturnValue(
      new Promise((resolve) => {
        resolveLike = resolve;
      }),
    );
    const { result } = renderHook(() => useLikes(applyLikeUpdate));

    let togglePromise!: Promise<void>;
    act(() => {
      togglePromise = result.current.toggleLike(post({ id: 1, likeCount: 0, likedByMe: false }));
    });

    expect(result.current.isToggling(1)).toBe(true);
    expect(result.current.isToggling(2)).toBe(false);

    await act(async () => {
      resolveLike({ likeCount: 1, likedByMe: true });
      await togglePromise;
    });

    expect(result.current.isToggling(1)).toBe(false);
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockLikePost.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useLikes(applyLikeUpdate));
    await act(async () => {
      await result.current.toggleLike(post({ id: 1, likeCount: 0, likedByMe: false }));
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
