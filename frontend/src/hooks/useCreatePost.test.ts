import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatePost } from './useCreatePost';
import { createPost } from '../api/posts';
import type { Post } from '../types/post';

vi.mock('../api/posts');

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

describe('useCreatePost', () => {
  const upsertPosts = vi.fn();
  const setPostIds = vi.fn();
  const setError = vi.fn();

  beforeEach(() => {
    upsertPosts.mockClear();
    setPostIds.mockClear();
    setError.mockClear();
  });

  it('addPostが成功すると、ストアに反映され先頭にidが追加される', async () => {
    mockCreatePost.mockResolvedValue(post({ id: 5, content: '新規投稿' }));
    const { result } = renderHook(() => useCreatePost('all', upsertPosts, setPostIds, setError));

    let success = false;
    await act(async () => {
      success = await result.current.addPost('新規投稿', []);
    });

    expect(success).toBe(true);
    expect(upsertPosts).toHaveBeenCalledWith([post({ id: 5, content: '新規投稿' })]);
    expect(setPostIds).toHaveBeenCalled();
    const updater = setPostIds.mock.calls[0][0] as (prev: number[]) => number[];
    expect(updater([1, 2])).toEqual([5, 1, 2]);
    expect(result.current.submitting).toBe(false);
  });

  it('addPostが失敗するとerrorが設定されfalseを返す', async () => {
    mockCreatePost.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useCreatePost('all', upsertPosts, setPostIds, setError));

    let success = true;
    await act(async () => {
      success = await result.current.addPost('失敗する投稿', []);
    });

    expect(success).toBe(false);
    expect(setError).toHaveBeenCalledWith('投稿に失敗しました。');
    expect(setPostIds).not.toHaveBeenCalled();
  });

  it('送信中にidentityが変わっていたら、ストアには反映されるがsetPostIdsは呼ばれない', async () => {
    let resolveCreatePost: (created: Post) => void = () => {};
    mockCreatePost.mockReturnValue(
      new Promise<Post>((resolve) => {
        resolveCreatePost = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ identity }) => useCreatePost(identity, upsertPosts, setPostIds, setError),
      { initialProps: { identity: 'all' as unknown } },
    );

    let addPostPromise!: Promise<boolean>;
    act(() => {
      addPostPromise = result.current.addPost('送信中に切り替え', []);
    });

    // 送信中に対象（identity）が切り替わる
    rerender({ identity: 'following' });

    await act(async () => {
      resolveCreatePost(post({ id: 9, content: '送信中に切り替え' }));
      await addPostPromise;
    });

    expect(upsertPosts).toHaveBeenCalledWith([post({ id: 9, content: '送信中に切り替え' })]);
    expect(setPostIds).not.toHaveBeenCalled();
  });
});
