import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { createComment, deleteComment, fetchComments } from '../api/comments';
import type { Comment } from '../types/comment';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * 投稿詳細ビューで表示中の投稿（postId）に対するコメント一覧取得・投稿・削除を行うフック。
 * postIdがnull（詳細ビューを表示していない）の間はフェッチしない。
 *
 * コメントの追加・削除に成功したらonCommentCountChangeを呼び、usePosts側のposts配列が持つ
 * commentCountと同期させる。
 */
export function useComments(postId: number | null, onCommentCountChange: (postId: number, delta: number) => void) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId === null) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchComments(postId)
      .then((res) => {
        if (!cancelled) setComments(res.comments);
      })
      .catch((err) => {
        if (!cancelled) setError(toErrorMessage(err, 'コメントの取得に失敗しました。'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const addComment = useCallback(
    async (content: string): Promise<boolean> => {
      if (postId === null) return false;
      setSubmitting(true);
      setError(null);
      try {
        const created = await createComment(postId, { content });
        setComments((prev) => [...prev, created]);
        onCommentCountChange(postId, 1);
        return true;
      } catch (err) {
        setError(toErrorMessage(err, 'コメントの投稿に失敗しました。'));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [postId, onCommentCountChange],
  );

  const removeComment = useCallback(
    async (commentId: number): Promise<boolean> => {
      if (postId === null) return false;
      setDeletingId(commentId);
      setError(null);
      try {
        await deleteComment(commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommentCountChange(postId, -1);
        return true;
      } catch (err) {
        setError(toErrorMessage(err, 'コメントの削除に失敗しました。'));
        return false;
      } finally {
        setDeletingId(null);
      }
    },
    [postId, onCommentCountChange],
  );

  const clearError = useCallback(() => setError(null), []);

  return { comments, loading, submitting, deletingId, error, addComment, removeComment, clearError };
}
