import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComments } from './useComments';
import { createComment, deleteComment, fetchComments } from '../api/comments';
import type { Comment } from '../types/comment';

vi.mock('../api/comments');

const mockFetchComments = vi.mocked(fetchComments);
const mockCreateComment = vi.mocked(createComment);
const mockDeleteComment = vi.mocked(deleteComment);

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 1,
    postId: 1,
    userId: 2,
    username: 'jiro',
    displayName: '次郎',
    avatarUrl: null,
    content: 'コメント本文',
    isOwnedByMe: false,
    ...overrides,
  };
}

describe('useComments', () => {
  const onCommentCountChange = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('postIdがnullの間はフェッチしない', () => {
    const { result } = renderHook(() => useComments(null, onCommentCountChange));

    expect(result.current.comments).toEqual([]);
    expect(mockFetchComments).not.toHaveBeenCalled();
  });

  it('postIdが設定されるとコメント一覧を取得する', async () => {
    mockFetchComments.mockResolvedValue({ comments: [comment({ id: 1 })] });

    const { result } = renderHook(() => useComments(1, onCommentCountChange));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toEqual([comment({ id: 1 })]);
    expect(mockFetchComments).toHaveBeenCalledWith(1);
  });

  it('取得に失敗するとerrorが設定される', async () => {
    mockFetchComments.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useComments(1, onCommentCountChange));

    await waitFor(() => expect(result.current.error).toBe('コメントの取得に失敗しました。'));
  });

  it('postIdがnullに戻ると一覧とエラーがリセットされる', async () => {
    mockFetchComments.mockResolvedValue({ comments: [comment()] });
    const { result, rerender } = renderHook(({ postId }) => useComments(postId, onCommentCountChange), {
      initialProps: { postId: 1 as number | null },
    });
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    rerender({ postId: null });

    expect(result.current.comments).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('addCommentが成功すると一覧に追加されonCommentCountChangeが+1で呼ばれる', async () => {
    mockFetchComments.mockResolvedValue({ comments: [] });
    mockCreateComment.mockResolvedValue(comment({ id: 10, content: '新しいコメント' }));
    const { result } = renderHook(() => useComments(1, onCommentCountChange));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.addComment('新しいコメント');
    });

    expect(success).toBe(true);
    expect(result.current.comments).toEqual([comment({ id: 10, content: '新しいコメント' })]);
    expect(onCommentCountChange).toHaveBeenCalledWith(1, 1);
  });

  it('addCommentが失敗するとerrorが設定されfalseを返す', async () => {
    mockFetchComments.mockResolvedValue({ comments: [] });
    mockCreateComment.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useComments(1, onCommentCountChange));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.addComment('失敗するコメント');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('コメントの投稿に失敗しました。');
    expect(onCommentCountChange).not.toHaveBeenCalled();
  });

  it('postIdがnullのときaddCommentを呼ぶとfalseを返しAPIを呼ばない', async () => {
    const { result } = renderHook(() => useComments(null, onCommentCountChange));

    let success = true;
    await act(async () => {
      success = await result.current.addComment('無視されるはず');
    });

    expect(success).toBe(false);
    expect(mockCreateComment).not.toHaveBeenCalled();
  });

  it('removeCommentが成功すると一覧から除かれonCommentCountChangeが-1で呼ばれる', async () => {
    mockFetchComments.mockResolvedValue({ comments: [comment({ id: 10 })] });
    mockDeleteComment.mockResolvedValue(undefined);
    const { result } = renderHook(() => useComments(1, onCommentCountChange));
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    let success = false;
    await act(async () => {
      success = await result.current.removeComment(10);
    });

    expect(success).toBe(true);
    expect(result.current.comments).toEqual([]);
    expect(onCommentCountChange).toHaveBeenCalledWith(1, -1);
  });

  it('removeCommentが失敗するとerrorが設定されfalseを返し一覧は変わらない', async () => {
    mockFetchComments.mockResolvedValue({ comments: [comment({ id: 10 })] });
    mockDeleteComment.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useComments(1, onCommentCountChange));
    await waitFor(() => expect(result.current.comments).toHaveLength(1));

    let success = true;
    await act(async () => {
      success = await result.current.removeComment(10);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('コメントの削除に失敗しました。');
    expect(result.current.comments).toHaveLength(1);
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockFetchComments.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useComments(1, onCommentCountChange));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
