import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { createPost, deletePost, fetchPosts, updatePost } from '../api/posts';
import type { Post } from '../types/post';

const PAGE_SIZE = 20;
// 他利用者の新規投稿をタイムラインに自動反映するためのポーリング間隔
const POLL_INTERVAL_MS = 10000;

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  // ポーリング・追加読み込みは常に最新のpostsを参照したいが、
  // useEffect/useCallbackの依存配列にpostsを含めると再登録が頻発するためrefで持つ
  const postsRef = useRef<Post[]>([]);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // 無限スクロールのIntersectionObserverはpostsが伸びている間ずっと交差状態になり得るため、
  // loadMore自体に多重実行防止を持たせる（呼び出し側で連打防止を意識しなくてよいようにする）
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 初回ロード
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPosts({ limit: PAGE_SIZE });
        if (!cancelled) {
          setPosts(res.posts);
          setHasMore(res.hasMore);
        }
      } catch (err) {
        if (!cancelled) setError(toErrorMessage(err, '投稿の取得に失敗しました。'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 他利用者の新規投稿をポーリングで検知し、一覧の先頭に追加する
  useEffect(() => {
    const interval = setInterval(async () => {
      const newestId = postsRef.current[0]?.id;
      if (newestId === undefined) return;
      try {
        const res = await fetchPosts({ afterId: newestId, limit: PAGE_SIZE });
        if (res.posts.length > 0) {
          setPosts((prev) => [...res.posts, ...prev]);
        }
      } catch (err) {
        // ポーリングの失敗は画面を止めるほどの問題ではないためログのみ
        console.error(err);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const oldestId = postsRef.current[postsRef.current.length - 1]?.id;
    if (oldestId === undefined) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchPosts({ beforeId: oldestId, limit: PAGE_SIZE });
      setPosts((prev) => [...prev, ...res.posts]);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(toErrorMessage(err, '投稿の追加取得に失敗しました。'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const addPost = useCallback(async (content: string): Promise<boolean> => {
    setError(null);
    setSubmitting(true);
    try {
      const created = await createPost({ content });
      setPosts((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      setError(toErrorMessage(err, '投稿に失敗しました。'));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

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

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    loadMore,
    addPost,
    editPost,
    removePost,
    clearError,
  };
}
