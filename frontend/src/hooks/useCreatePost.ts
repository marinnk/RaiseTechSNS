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
 *
 * 対象の切り替わり検知には、単純なidentityの一致比較ではなく、useFollowList.ts/
 * useUserSearch.tsと同じ「直近の送信の通し番号」方式を使う。一致比較だと、送信中にA→B→Aの
 * ように元の対象へ戻ってきた場合に「変わっていない」と誤判定してしまう（戻ってきた時点で
 * 一覧は再取得され、サーバー側で既に反映済みの投稿を含んでいる可能性があるため、そこへ
 * 古い送信の結果を重ねて追加すると投稿が重複表示されてしまう）。通し番号は対象が変わる
 * たびに単調増加するため、一度でも対象が変わればその後同じ対象に戻ってきても一致しない。
 */
export function useCreatePost(
  identity: unknown,
  upsertPosts: (posts: Post[]) => void,
  setPostIds: Dispatch<SetStateAction<number[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
) {
  const [submitting, setSubmitting] = useState(false);
  const latestRequestRef = useRef(0);
  useEffect(() => {
    latestRequestRef.current += 1;
  }, [identity]);

  const addPost = useCallback(
    async (content: string, images: File[]): Promise<boolean> => {
      const requestId = ++latestRequestRef.current;
      setError(null);
      setSubmitting(true);
      try {
        const created = await createPost({ content }, images);
        upsertPosts([created]);
        if (latestRequestRef.current === requestId) {
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
    [upsertPosts, setPostIds, setError],
  );

  return { submitting, addPost };
}
