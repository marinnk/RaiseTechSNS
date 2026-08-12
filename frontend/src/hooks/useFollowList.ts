import { useCallback, useEffect, useState } from 'react';
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

  // 表示中の利用者が変わったら（別のプロフィールへ遷移したら）、開いていたパネルは閉じる
  useEffect(() => {
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
      setLoading(true);
      setError(null);
      try {
        const res = type === 'followers' ? await fetchFollowers(userId) : await fetchFollowing(userId);
        setUsers(res.users);
      } catch (err) {
        setError(toErrorMessage(err, '一覧の取得に失敗しました。'));
      } finally {
        setLoading(false);
      }
    },
    [openPanel, userId],
  );

  return { openPanel, users, loading, error, togglePanel };
}
