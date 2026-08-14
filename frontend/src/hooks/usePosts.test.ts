import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePosts } from './usePosts';
import { createPost, fetchPosts } from '../api/posts';
import { post } from '../testUtils/postFixture';

vi.mock('../api/posts');

const mockFetchPosts = vi.mocked(fetchPosts);
const mockCreatePost = vi.mocked(createPost);

describe('usePosts', () => {
  const upsertPosts = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初期表示（scope: all）ではscopeパラメータ無しで取得する', async () => {
    mockFetchPosts.mockResolvedValue({ posts: [post({ id: 1 }), post({ id: 2 })], hasMore: true });
    const { result } = renderHook(() => usePosts('all', upsertPosts));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.postIds).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
    expect(mockFetchPosts).toHaveBeenCalledWith({ limit: 20, scope: undefined });
    expect(upsertPosts).toHaveBeenCalledWith([post({ id: 1 }), post({ id: 2 })]);
  });

  it('scope: followingのときはscope="following"を付けて取得する', async () => {
    mockFetchPosts.mockResolvedValue({ posts: [], hasMore: false });
    renderHook(() => usePosts('following', upsertPosts));

    await waitFor(() => expect(mockFetchPosts).toHaveBeenCalledWith({ limit: 20, scope: 'following' }));
  });

  it('取得に失敗するとerrorが設定される', async () => {
    mockFetchPosts.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePosts('all', upsertPosts));

    await waitFor(() => expect(result.current.error).toBe('投稿の取得に失敗しました。'));
  });

  it('loadMoreは最後のidをbeforeIdとして追加取得する', async () => {
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 5 })], hasMore: true });
    const { result } = renderHook(() => usePosts('all', upsertPosts));
    await waitFor(() => expect(result.current.postIds).toEqual([5]));

    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 4 })], hasMore: false });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetchPosts).toHaveBeenLastCalledWith({ beforeId: 5, limit: 20, scope: undefined });
    expect(result.current.postIds).toEqual([5, 4]);
    expect(result.current.hasMore).toBe(false);
  });

  it('ポーリングで他利用者の新着投稿を検知しても、postIdsにはshowNewPostsを呼ぶまで反映されない', async () => {
    vi.useFakeTimers();
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 1 })], hasMore: false });
    const { result } = renderHook(() => usePosts('all', upsertPosts));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.postIds).toEqual([1]);

    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 2 })], hasMore: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(mockFetchPosts).toHaveBeenLastCalledWith({ afterId: 1, limit: 20, scope: undefined });
    expect(result.current.newPostsCount).toBe(1);
    expect(result.current.postIds).toEqual([1]);
  });

  it('showNewPostsで新着投稿が先頭に反映されnewPostsCountが0に戻る', async () => {
    vi.useFakeTimers();
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 1 })], hasMore: false });
    const { result } = renderHook(() => usePosts('all', upsertPosts));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 2 })], hasMore: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    act(() => {
      result.current.showNewPosts();
    });

    expect(result.current.postIds).toEqual([2, 1]);
    expect(result.current.newPostsCount).toBe(0);
  });

  it('複数回のポーリングで新着件数が積み上がる', async () => {
    vi.useFakeTimers();
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 1 })], hasMore: false });
    const { result } = renderHook(() => usePosts('all', upsertPosts));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 2 })], hasMore: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(result.current.newPostsCount).toBe(1);

    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 3 })], hasMore: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(result.current.newPostsCount).toBe(2);
  });

  it('アンマウント後はポーリングによるsetStateが行われない（console.errorも出ない）', async () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 1 })], hasMore: false });
    const { result, unmount } = renderHook(() => usePosts('all', upsertPosts));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.postIds).toEqual([1]);

    unmount();
    mockFetchPosts.mockResolvedValueOnce({ posts: [post({ id: 2 })], hasMore: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('addPostが成功すると先頭にidが追加される', async () => {
    mockFetchPosts.mockResolvedValue({ posts: [], hasMore: false });
    mockCreatePost.mockResolvedValue(post({ id: 10, content: '新規投稿' }));
    const { result } = renderHook(() => usePosts('all', upsertPosts));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.addPost('新規投稿', []);
    });

    expect(success).toBe(true);
    expect(result.current.postIds).toEqual([10]);
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockFetchPosts.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePosts('all', upsertPosts));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
