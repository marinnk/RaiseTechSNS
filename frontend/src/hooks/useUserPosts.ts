import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPosts } from '../api/posts';
import { toErrorMessage } from '../utils/apiError';
import type { Post } from '../types/post';

const PAGE_SIZE = 20;

/**
 * プロフィール画面の「その利用者の投稿id一覧」を管理するフック。usePostsと違い、新規投稿
 * フォームやポーリングによる新着通知は持たない（プロフィール画面ではリアルタイム反映を
 * 要件としていないため）。
 *
 * 投稿の実データ（本文・いいね数等）は持たず、{@link usePostStore}が唯一の情報源となる。
 * 編集・削除・いいね・コメント数の更新もストア側の関数（`editPost`/`removePost`/
 * `applyLikeUpdate`/`bumpCommentCount`）をそのまま使うため、このフックはid一覧の取得・
 * ページネーションだけに責務を絞っている。
 *
 * userIdがnull（プロフィール画面を表示していない）の間はフェッチしない。
 */
export function useUserPosts(userId: number | null, upsertPosts: (posts: Post[]) => void) {
  const [postIds, setPostIds] = useState<number[]>([]);
  const postIdsRef = useRef<number[]>([]);
  useEffect(() => {
    postIdsRef.current = postIds;
  }, [postIds]);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) {
      setPostIds([]);
      setHasMore(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPosts({ userId, limit: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) {
          upsertPosts(res.posts);
          setPostIds(res.posts.map((p) => p.id));
          setHasMore(res.hasMore);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(toErrorMessage(err, '投稿の取得に失敗しました。'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, upsertPosts]);

  const loadMore = useCallback(async () => {
    if (userId === null || loadingMoreRef.current) return;
    const oldestId = postIdsRef.current[postIdsRef.current.length - 1];
    if (oldestId === undefined) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchPosts({ userId, beforeId: oldestId, limit: PAGE_SIZE });
      upsertPosts(res.posts);
      setPostIds((prev) => [...prev, ...res.posts.map((p) => p.id)]);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(toErrorMessage(err, '投稿の追加取得に失敗しました。'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userId, upsertPosts]);

  const clearError = useCallback(() => setError(null), []);

  return { postIds, loading, loadingMore, hasMore, error, loadMore, clearError };
}
