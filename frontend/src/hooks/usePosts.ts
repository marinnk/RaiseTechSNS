import { useCallback, useEffect, useRef, useState } from 'react';
import { createPost, fetchPosts } from '../api/posts';
import { toErrorMessage } from '../utils/apiError';
import type { Post } from '../types/post';

const PAGE_SIZE = 20;
// 他利用者の新規投稿を検知するためのポーリング間隔。投稿中の作業を頻繁に邪魔しないよう長めにする
const POLL_INTERVAL_MS = 30000;

/**
 * タイムライン一覧（S03）の「どの投稿idを、新しい順にどの並びで表示するか」を管理するフック。
 * 投稿の実データ（本文・いいね数等）は持たず、{@link usePostStore}が唯一の情報源となる。
 * 取得した投稿は`upsertPosts`でストアに反映し、このフック自身はidの並び（`postIds`）と
 * ページネーション・ポーリングの状態だけを管理する。
 */
export function usePosts(scope: 'all' | 'following', upsertPosts: (posts: Post[]) => void) {
  // バックエンドへは絞り込み無し（'all'）のときはscopeパラメータ自体を送らない（既存の
  // GET /api/posts?limit=20 という呼び出し方を変えないため）。'following'のときだけ渡す
  const apiScope = scope === 'following' ? 'following' : undefined;

  const [postIds, setPostIds] = useState<number[]>([]);
  // ポーリング・追加読み込みは常に最新のpostIdsを参照したいが、
  // useEffect/useCallbackの依存配列にpostIdsを含めると再登録が頻発するためrefで持つ
  const postIdsRef = useRef<number[]>([]);
  useEffect(() => {
    postIdsRef.current = postIds;
  }, [postIds]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // 無限スクロールのIntersectionObserverはpostsが伸びている間ずっと交差状態になり得るため、
  // loadMore自体に多重実行防止を持たせる（呼び出し側で連打防止を意識しなくてよいようにする）
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ポーリングで見つかった他利用者の新着投稿のid。スクロール位置をいきなり動かさないよう、
  // 見つかった時点ではpostIdsに混ぜず、ここに貯めておいて「新着通知バナー」がクリックされたら反映する
  const [newPostIds, setNewPostIds] = useState<number[]>([]);
  const newPostIdsRef = useRef<number[]>([]);
  useEffect(() => {
    newPostIdsRef.current = newPostIds;
  }, [newPostIds]);

  // 初回ロード。scopeが変わったとき（「全体」⇔「フォロー中」タブの切り替え）も、
  // 別の絞り込み条件での一覧として最初から取得し直す
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPostIds([]);
    setNewPostIds([]);
    setHasMore(false);
    (async () => {
      try {
        const res = await fetchPosts({ limit: PAGE_SIZE, scope: apiScope });
        if (!cancelled) {
          upsertPosts(res.posts);
          setPostIds(res.posts.map((p) => p.id));
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
  }, [apiScope, upsertPosts]);

  // 他利用者の新規投稿をポーリングで検知する。見つかった投稿はnewPostIdsに積み増すだけで、
  // 一覧（postIds）へはshowNewPosts()が呼ばれるまで反映しない
  useEffect(() => {
    // 初回ロードのuseEffectと同様、アンマウント後にfetch結果でsetStateしてしまわないためのガード
    let cancelled = false;
    const interval = setInterval(async () => {
      // 既にnewPostIdsに貯まっている分があれば、その先頭（＝一番新しいid）を基準にする
      const newestKnownId = newPostIdsRef.current[0] ?? postIdsRef.current[0];
      if (newestKnownId === undefined) return;
      try {
        const res = await fetchPosts({ afterId: newestKnownId, limit: PAGE_SIZE, scope: apiScope });
        if (!cancelled && res.posts.length > 0) {
          upsertPosts(res.posts);
          setNewPostIds((prev) => [...res.posts.map((p) => p.id), ...prev]);
        }
      } catch (err) {
        // ポーリングの失敗は画面を止めるほどの問題ではないためログのみ
        if (!cancelled) console.error(err);
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiScope, upsertPosts]);

  // 新着通知バナーがクリックされたら、貯めておいた新着投稿を一覧の先頭にまとめて反映する
  const showNewPosts = useCallback(() => {
    if (newPostIdsRef.current.length === 0) return;
    setPostIds((prev) => [...newPostIdsRef.current, ...prev]);
    setNewPostIds([]);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const oldestId = postIdsRef.current[postIdsRef.current.length - 1];
    if (oldestId === undefined) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchPosts({ beforeId: oldestId, limit: PAGE_SIZE, scope: apiScope });
      upsertPosts(res.posts);
      setPostIds((prev) => [...prev, ...res.posts.map((p) => p.id)]);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(toErrorMessage(err, '投稿の追加取得に失敗しました。'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [apiScope, upsertPosts]);

  const addPost = useCallback(
    async (content: string, images: File[]): Promise<boolean> => {
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
    [upsertPosts],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    postIds,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    newPostsCount: newPostIds.length,
    loadMore,
    addPost,
    showNewPosts,
    clearError,
  };
}
