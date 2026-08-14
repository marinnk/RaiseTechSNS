import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePostStore } from './usePostStore';
import { deletePost, updatePost } from '../api/posts';
import { post } from '../testUtils/postFixture';

vi.mock('../api/posts');

const mockUpdatePost = vi.mocked(updatePost);
const mockDeletePost = vi.mocked(deletePost);

describe('usePostStore', () => {
  it('upsertPostsで投稿を登録し、getPostsで指定したid順に取得できる', () => {
    const { result } = renderHook(() => usePostStore());

    act(() => {
      result.current.upsertPosts([post({ id: 1 }), post({ id: 2 })]);
    });

    expect(result.current.getPosts([2, 1])).toEqual([post({ id: 2 }), post({ id: 1 })]);
  });

  it('getPostsはストアに無いidを結果から除外する', () => {
    const { result } = renderHook(() => usePostStore());

    act(() => {
      result.current.upsertPosts([post({ id: 1 })]);
    });

    expect(result.current.getPosts([1, 99])).toEqual([post({ id: 1 })]);
  });

  it('upsertPostsは空配列なら何もしない', () => {
    const { result } = renderHook(() => usePostStore());
    const before = result.current.getPosts([1]);

    act(() => {
      result.current.upsertPosts([]);
    });

    expect(result.current.getPosts([1])).toEqual(before);
  });

  it('applyLikeUpdateは既存の投稿のlikeCount/likedByMeのみ書き換える', () => {
    const { result } = renderHook(() => usePostStore());
    act(() => {
      result.current.upsertPosts([post({ id: 1, likeCount: 0, likedByMe: false })]);
    });

    act(() => {
      result.current.applyLikeUpdate(1, { likeCount: 1, likedByMe: true });
    });

    expect(result.current.getPosts([1])[0]).toEqual(post({ id: 1, likeCount: 1, likedByMe: true }));
  });

  it('applyLikeUpdateはストアに存在しないidに対しては何もしない', () => {
    const { result } = renderHook(() => usePostStore());

    act(() => {
      result.current.applyLikeUpdate(99, { likeCount: 1, likedByMe: true });
    });

    expect(result.current.getPosts([99])).toEqual([]);
  });

  it('bumpCommentCountはcommentCountをdeltaぶん加算する', () => {
    const { result } = renderHook(() => usePostStore());
    act(() => {
      result.current.upsertPosts([post({ id: 1, commentCount: 2 })]);
    });

    act(() => {
      result.current.bumpCommentCount(1, -1);
    });

    expect(result.current.getPosts([1])[0].commentCount).toBe(1);
  });

  it('editPostが成功するとストアが更新されtrueを返す', async () => {
    mockUpdatePost.mockResolvedValue(post({ id: 1, content: '編集後' }));
    const { result } = renderHook(() => usePostStore());

    let success = false;
    await act(async () => {
      success = await result.current.editPost(1, '編集後', [], []);
    });

    expect(success).toBe(true);
    expect(result.current.getPosts([1])[0].content).toBe('編集後');
  });

  it('editPostが失敗するとerrorが設定されfalseを返す', async () => {
    mockUpdatePost.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePostStore());

    let success = true;
    await act(async () => {
      success = await result.current.editPost(1, '編集後', [], []);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('投稿の編集に失敗しました。');
  });

  it('removePostが成功するとストアから除かれtrueを返す', async () => {
    mockDeletePost.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePostStore());
    act(() => {
      result.current.upsertPosts([post({ id: 1 })]);
    });

    let success = false;
    await act(async () => {
      success = await result.current.removePost(1);
    });

    expect(success).toBe(true);
    expect(result.current.getPosts([1])).toEqual([]);
  });

  it('removePostが失敗するとerrorが設定されfalseを返しストアは変わらない', async () => {
    mockDeletePost.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePostStore());
    act(() => {
      result.current.upsertPosts([post({ id: 1 })]);
    });

    let success = true;
    await act(async () => {
      success = await result.current.removePost(1);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('投稿の削除に失敗しました。');
    expect(result.current.getPosts([1])).toHaveLength(1);
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockDeletePost.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePostStore());
    await act(async () => {
      await result.current.removePost(1);
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
