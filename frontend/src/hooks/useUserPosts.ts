import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { deletePost, fetchPosts, updatePost } from '../api/posts';
import type { Post } from '../types/post';

const PAGE_SIZE = 20;

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * プロフィール画面の「その利用者の投稿一覧」用のフック。usePostsと違い、新規投稿フォームや
 * ポーリングによる新着通知は持たない（プロフィール画面ではリアルタイム反映を要件としていないため）。
 * 一方で、この一覧から投稿詳細ビューを開いたときに編集・削除・いいねができるよう、
 * usePostsと同じ形のeditPost/removePost/applyLikeUpdate/bumpCommentCountを公開する。
 *
 * userIdがnull（プロフィール画面を表示していない）の間はフェッチしない。
 */
export function useUserPosts(userId: number | null) {
  const [posts, setPosts] = useState<Post[]>([]);
  const postsRef = useRef<Post[]>([]);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) {
      setPosts([]);
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
          setPosts(res.posts);
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
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (userId === null || loadingMoreRef.current) return;
    const oldestId = postsRef.current[postsRef.current.length - 1]?.id;
    if (oldestId === undefined) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchPosts({ userId, beforeId: oldestId, limit: PAGE_SIZE });
      setPosts((prev) => [...prev, ...res.posts]);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(toErrorMessage(err, '投稿の追加取得に失敗しました。'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userId]);

  const editPost = useCallback(async (postId: number, content: string): Promise<boolean> => {
    setError(null);
    try {
      const updated = await updatePost(postId, { content });
      setPosts((prev) => prev.map((post) => (post.id === postId ? updated : post)));
      return true;
    } catch (err) {
      setError(toErrorMessage(err, '投稿の編集に失敗しました。'));
      return false;
    }
  }, []);

  const removePost = useCallback(async (postId: number): Promise<boolean> => {
    setError(null);
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      return true;
    } catch (err) {
      setError(toErrorMessage(err, '投稿の削除に失敗しました。'));
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const applyLikeUpdate = useCallback(
    (postId: number, patch: { likeCount: number; likedByMe: boolean }) => {
      setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...patch } : post)));
    },
    [],
  );

  const bumpCommentCount = useCallback((postId: number, delta: number) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, commentCount: post.commentCount + delta } : post)));
  }, []);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    editPost,
    removePost,
    clearError,
    applyLikeUpdate,
    bumpCommentCount,
  };
}
