import { useCallback, useEffect, useRef, useState } from 'react';
import { createPost } from '../api/posts';
import { toErrorMessage } from '../utils/apiError';
import type { Dispatch, SetStateAction } from 'react';
import type { Post } from '../types/post';

/**
 * 投稿作成（POST /api/posts）の送信状態・エラー処理を担う共通フック。usePosts（タイムライン）・
 * useUserPosts（プロフィール）の両方から使われる。
 *
 * `identity`は、送信中に一覧の対象が切り替わったこと（usePostsなら「全体」⇔「フォロー中」の
 * タブ切り替え、useUserPostsなら別の利用者のプロフィールへの遷移）を検知するためのキー。
 * 送信開始時と比べてレスポンス受信時にidentityが変わっていたら、その投稿は今表示中の一覧
 * （postIds）には反映しない（投稿自体は成功しているため、ストアへの反映＝upsertPostsは行う）。
 */
export function useCreatePost(
  identity: unknown,
  upsertPosts: (posts: Post[]) => void,
  setPostIds: Dispatch<SetStateAction<number[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
) {
  const [submitting, setSubmitting] = useState(false);
  const identityRef = useRef(identity);
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  const addPost = useCallback(
    async (content: string, images: File[]): Promise<boolean> => {
      const submittedIdentity = identity;
      setError(null);
      setSubmitting(true);
      try {
        const created = await createPost({ content }, images);
        upsertPosts([created]);
        if (identityRef.current === submittedIdentity) {
          setPostIds((prev) => [created.id, ...prev]);
        }
        return true;
      } catch (err) {
        setError(toErrorMessage(err, '投稿に失敗しました。'));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [identity, upsertPosts, setPostIds, setError],
  );

  return { submitting, addPost };
}
