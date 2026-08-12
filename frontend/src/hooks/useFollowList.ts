import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFollowers, fetchFollowing } from '../api/follows';
import { toErrorMessage } from '../utils/apiError';
import type { UserSummary } from '../types/follow';

export type FollowListType = 'followers' | 'following';

/**
 * プロフィール画面の「フォロー中」「フォロワー」の人数をクリックしたときに開閉する
 * 一覧パネル用フック（プロトタイプの展開パネルと同じUX）。開いたときだけAPIを呼ぶ。
 */
export function useFollowList(userId: number | null) {
  const [openPanel, setOpenPanel] = useState<FollowListType | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 直近に発行したリクエストの通し番号。ある一覧取得の途中で別のプロフィールへ遷移したり
  // パネルを開き直したりして新しいリクエストが発行された場合、古いリクエストの応答が
  // 後から返ってきても（＝この番号と一致しなくなる）表示中の一覧を上書きしないよう無視する
  const latestRequestRef = useRef(0);

  // 表示中の利用者が変わったら（別のプロフィールへ遷移したら）、開いていたパネルを閉じ、
  // 保留中のリクエストがあれば無効化する
  useEffect(() => {
    latestRequestRef.current += 1;
    setOpenPanel(null);
    setUsers([]);
    setError(null);
  }, [userId]);

  const togglePanel = useCallback(
    async (type: FollowListType) => {
      if (openPanel === type) {
        setOpenPanel(null);
        return;
      }
      setOpenPanel(type);
      if (userId === null) return;
      const requestId = ++latestRequestRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = type === 'followers' ? await fetchFollowers(userId) : await fetchFollowing(userId);
        if (latestRequestRef.current !== requestId) return;
        setUsers(res.users);
      } catch (err) {
        if (latestRequestRef.current !== requestId) return;
        setError(toErrorMessage(err, '一覧の取得に失敗しました。'));
      } finally {
        if (latestRequestRef.current === requestId) setLoading(false);
      }
    },
    [openPanel, userId],
  );

  return { openPanel, users, loading, error, togglePanel };
}
