import { useCallback, useEffect, useRef, useState } from 'react';
import { createPost, fetchPosts } from '../api/posts';
import { toErrorMessage } from '../utils/apiError';
import type { Post } from '../types/post';

const PAGE_SIZE = 20;

/**
 * プロフィール画面の「その利用者の投稿id一覧」を管理するフック。usePostsと違い、他利用者の
 * 新規投稿を検知するポーリングは持たない（プロフィール画面ではリアルタイム反映を要件と
 * していないため）。自分のプロフィールを表示しているときの新規投稿（`addPost`）は
 * usePosts.addPostと同様の形でサポートする。
 *
 * 投稿の実データ（本文・いいね数等）は持たず、{@link usePostStore}が唯一の情報源となる。
 * 編集・削除・いいね・コメント数の更新もストア側の関数（`editPost`/`removePost`/
 * `applyLikeUpdate`/`bumpCommentCount`）をそのまま使うため、このフックはid一覧の取得・
 * ページネーション・自分の新規投稿の反映だけに責務を絞っている。
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
  const [submitting, setSubmitting] = useState(false);

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

  const addPost = useCallback(
    async (content: string, images: File[]): Promise<boolean> => {
      if (userId === null) return false;
      setError(null);
      setSubmitting(true);
      try {
        const created = await createPost({ content }, images);
        upsertPosts([created]);
        setPostIds((prev) => [created.id, ...prev]);
        return true;
      } catch (err) {
        setError(toErrorMessage(err, '投稿に失敗しました。'));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [userId, upsertPosts],
  );

  const clearError = useCallback(() => setError(null), []);

  return { postIds, loading, loadingMore, hasMore, error, submitting, loadMore, addPost, clearError };
}
