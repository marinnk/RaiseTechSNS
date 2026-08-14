import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserPosts } from './useUserPosts';
import { createPost, fetchPosts } from '../api/posts';
import type { Post } from '../types/post';

vi.mock('../api/posts');

const mockFetchPosts = vi.mocked(fetchPosts);
const mockCreatePost = vi.mocked(createPost);

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

describe('useUserPosts', () => {
  const upsertPosts = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('userIdがnullの間はフェッチしない', () => {
    const { result } = renderHook(() => useUserPosts(null, upsertPosts));

    expect(result.current.postIds).toEqual([]);
    expect(mockFetchPosts).not.toHaveBeenCalled();
  });

  it('userIdが設定されると、その利用者の投稿を取得する', async () => {
    mockFetchPosts.mockResolvedValue({ posts: [post({ id: 1 }), post({ id: 2 })], hasMore: true });
    const { result } = renderHook(() => useUserPosts(1, upsertPosts));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.postIds).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
    expect(mockFetchPosts).toHaveBeenCalledWith({ userId: 1, limit: 20 });
    expect(upsertPosts).toHaveBeenCalledWith([post({ id: 1 }), post({ id: 2 })]);
  });

  it('取得に失敗するとerrorが設定される', async () => {
    mockFetchPosts.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useUserPosts(1, upsertPosts));

    await waitFor(() => expect(result.current.error).toBe('投稿の取得に失敗しました。'));
  });

  it('userIdがnullに戻るとpostIds・hasMore・errorがリセットされる', async () => {
    mockFetchPosts.mockResolvedValue({ posts: [post({ id: 1 })], hasMore: true });
    const { result, rerender } = renderHook(({ userId }) => useUserPosts(userId, upsertPosts), {
      initialProps: { userId: 1 as number | null },
    });
    await waitFor(() => expect(result.current.postIds).toEqual([1]));

    rerender({ userId: null });

    expect(result.current.postIds).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('loadMoreは最後のidをbeforeIdとして追加取得する', async () => {
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 5 })], hasMore: true });
    const { result } = renderHook(() => useUserPosts(1, upsertPosts));
    await waitFor(() => expect(result.current.postIds).toEqual([5]));

    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 4 })], hasMore: false });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetchPosts).toHaveBeenLastCalledWith({ userId: 1, beforeId: 5, limit: 20 });
    expect(result.current.postIds).toEqual([5, 4]);
    expect(result.current.hasMore).toBe(false);
  });

  it('userIdがnullのときloadMoreを呼んでも何もしない', async () => {
    const { result } = renderHook(() => useUserPosts(null, upsertPosts));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetchPosts).not.toHaveBeenCalled();
  });

  it('addPostが成功すると先頭にidが追加される', async () => {
    mockFetchPosts.mockResolvedValue({ posts: [], hasMore: false });
    mockCreatePost.mockResolvedValue(post({ id: 10, content: '新規投稿' }));
    const { result } = renderHook(() => useUserPosts(1, upsertPosts));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.addPost('新規投稿', []);
    });

    expect(success).toBe(true);
    expect(result.current.postIds).toEqual([10]);
  });

  it('userIdがnullのときaddPostを呼ぶとfalseを返しAPIを呼ばない', async () => {
    const { result } = renderHook(() => useUserPosts(null, upsertPosts));

    let success = true;
    await act(async () => {
      success = await result.current.addPost('無視されるはず', []);
    });

    expect(success).toBe(false);
    expect(mockCreatePost).not.toHaveBeenCalled();
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockFetchPosts.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useUserPosts(1, upsertPosts));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
