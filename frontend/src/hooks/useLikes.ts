import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { likePost, unlikePost } from '../api/likes';
import type { Post } from '../types/post';

/**
 * いいねのトグル操作を提供するフック。likeCount/likedByMeの実体はusePosts側のposts配列
 * （唯一の情報源）が持ち、このフックは更新関数（applyLikeUpdate）を通じてそこを書き換えるだけ。
 *
 * 押した瞬間に見た目を変える楽観的更新を行い、APIが失敗したら元の状態にロールバックする。
 */
export function useLikes(applyLikeUpdate: (postId: number, patch: { likeCount: number; likedByMe: boolean }) => void) {
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const toggleLike = useCallback(
    async (post: Post) => {
      const previous = { likeCount: post.likeCount, likedByMe: post.likedByMe };
      const optimistic = post.likedByMe
        ? { likeCount: post.likeCount - 1, likedByMe: false }
        : { likeCount: post.likeCount + 1, likedByMe: true };

      setTogglingIds((prev) => new Set(prev).add(post.id));
      applyLikeUpdate(post.id, optimistic);
      setError(null);
      try {
        const result = post.likedByMe ? await unlikePost(post.id) : await likePost(post.id);
        // サーバー側の値（他利用者の操作と競合していないか含めた正の値）で確定させる
        applyLikeUpdate(post.id, result);
      } catch (err) {
        applyLikeUpdate(post.id, previous);
        setError(err instanceof ApiError ? err.message : 'いいねの処理に失敗しました。');
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
    },
    [applyLikeUpdate],
  );

  const isToggling = useCallback((postId: number) => togglingIds.has(postId), [togglingIds]);
  const clearError = useCallback(() => setError(null), []);

  return { toggleLike, isToggling, error, clearError };
}
