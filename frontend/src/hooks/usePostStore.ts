import { useCallback, useState } from 'react';
import { deletePost, updatePost } from '../api/posts';
import { toErrorMessage } from '../utils/apiError';
import type { Post } from '../types/post';

/**
 * アプリ全体で使う投稿データの唯一の情報源（id→Postのストア）。
 *
 * タイムライン一覧（usePosts）・プロフィールの投稿一覧（useUserPosts）は、同じ投稿
 * （同じid）を同時に表示することがある（例：自分の投稿は「全体」タイムラインにも
 * 自分のプロフィール画面にも表示される）。それぞれが投稿データを別々の配列として
 * 持ってしまうと、片方の画面で編集・削除・いいねしてももう片方には反映されず、
 * 削除したはずの投稿がタイムラインに残り続けるといった不整合が起きる。
 *
 * そのためこのフックが投稿の実データ（本文・いいね数・コメント数等）を1箇所にだけ持ち、
 * usePosts・useUserPostsは「どのidを、どの順番で表示するか」というid配列だけを管理して、
 * 表示する投稿の中身は必ずここ（getPosts）から取得する。編集・削除・いいね・コメント数の
 * 更新もこのストアの関数を通じて行うことで、どの画面から操作しても他の画面に自動的に
 * 反映される。
 */
export function usePostStore() {
  const [store, setStore] = useState<Record<number, Post>>({});
  const [error, setError] = useState<string | null>(null);

  // フェッチ結果の投稿をストアへ取り込む（新規追加・既存更新のどちらもこれで行う）
  const upsertPosts = useCallback((posts: Post[]) => {
    if (posts.length === 0) return;
    setStore((prev) => {
      const next = { ...prev };
      for (const post of posts) {
        next[post.id] = post;
      }
      return next;
    });
  }, []);

  // 指定したidの一覧を、ストアにある実データの配列として返す（ストアにまだ無いidは除外）
  const getPosts = useCallback(
    (ids: number[]): Post[] => ids.map((id) => store[id]).filter((post): post is Post => post !== undefined),
    [store],
  );

  // いいねボタン（useLikes）から呼ばれる
  const applyLikeUpdate = useCallback((postId: number, patch: { likeCount: number; likedByMe: boolean }) => {
    setStore((prev) => (prev[postId] ? { ...prev, [postId]: { ...prev[postId], ...patch } } : prev));
  }, []);

  // コメントの投稿・削除（useComments）から呼ばれる
  const bumpCommentCount = useCallback((postId: number, delta: number) => {
    setStore((prev) => {
      const existing = prev[postId];
      if (!existing) return prev;
      return { ...prev, [postId]: { ...existing, commentCount: existing.commentCount + delta } };
    });
  }, []);

  const editPost = useCallback(
    async (postId: number, content: string): Promise<boolean> => {
      setError(null);
      try {
        const updated = await updatePost(postId, { content });
        upsertPosts([updated]);
        return true;
      } catch (err) {
        setError(toErrorMessage(err, '投稿の編集に失敗しました。'));
        return false;
      }
    },
    [upsertPosts],
  );

  // 削除はストアからidを取り除くだけでよい。usePosts・useUserPosts側のid配列は
  // そのままでよく、getPostsがストアに存在しないidを結果から除外するため、
  // 削除した投稿はそれを表示していたすべての画面から自動的に消える
  const removePost = useCallback(async (postId: number): Promise<boolean> => {
    setError(null);
    try {
      await deletePost(postId);
      setStore((prev) => {
        if (!(postId in prev)) return prev;
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return true;
    } catch (err) {
      setError(toErrorMessage(err, '投稿の削除に失敗しました。'));
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { upsertPosts, getPosts, applyLikeUpdate, bumpCommentCount, editPost, removePost, error, clearError };
}

export type PostStore = ReturnType<typeof usePostStore>;
