import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { createPost, deletePost, fetchPosts, updatePost } from '../api/posts';
import type { Post } from '../types/post';

const PAGE_SIZE = 20;
// 他利用者の新規投稿を検知するためのポーリング間隔。投稿中の作業を頻繁に邪魔しないよう長めにする
const POLL_INTERVAL_MS = 30000;

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

  // ポーリングで見つかった他利用者の新着投稿。スクロール位置をいきなり動かさないよう、
  // 見つかった時点ではpostsに混ぜず、ここに貯めておいて「新着通知バナー」がクリックされたら反映する
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const newPostsRef = useRef<Post[]>([]);
  useEffect(() => {
    newPostsRef.current = newPosts;
  }, [newPosts]);

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

  // 他利用者の新規投稿をポーリングで検知する。見つかった投稿はnewPostsに積み増すだけで、
  // 一覧（posts）へはshowNewPosts()が呼ばれるまで反映しない
  useEffect(() => {
    const interval = setInterval(async () => {
      // 既にnewPostsに貯まっている分があれば、その先頭（＝一番新しいid）を基準にする
      const newestKnownId = newPostsRef.current[0]?.id ?? postsRef.current[0]?.id;
      if (newestKnownId === undefined) return;
      try {
        const res = await fetchPosts({ afterId: newestKnownId, limit: PAGE_SIZE });
        if (res.posts.length > 0) {
          setNewPosts((prev) => [...res.posts, ...prev]);
        }
      } catch (err) {
        // ポーリングの失敗は画面を止めるほどの問題ではないためログのみ
        console.error(err);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // 新着通知バナーがクリックされたら、貯めておいた新着投稿を一覧の先頭にまとめて反映する
  const showNewPosts = useCallback(() => {
    if (newPostsRef.current.length === 0) return;
    setPosts((prev) => [...newPostsRef.current, ...prev]);
    setNewPosts([]);
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
    newPostsCount: newPosts.length,
    loadMore,
    addPost,
    editPost,
    removePost,
    showNewPosts,
    clearError,
  };
}
