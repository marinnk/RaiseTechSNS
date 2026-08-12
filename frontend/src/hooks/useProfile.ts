import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { fetchProfile, updateMyProfile } from '../api/profile';
import type { Profile } from '../types/profile';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * プロフィール画面で表示中の利用者（userId）のプロフィールを取得するフック。
 * userIdがnull（プロフィール画面を表示していない）の間はフェッチしない。
 *
 * フォロー操作（useFollow）・自己紹介の更新の結果を画面へ反映できるよう、profileを
 * 直接書き換えるapplyProfileUpdateを公開する（usePosts.applyLikeUpdateと同じ設計）。
 */
export function useProfile(userId: number | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    if (userId === null) {
      setProfile(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchProfile(userId)
      .then((res) => {
        if (!cancelled) setProfile(res);
      })
      .catch((err) => {
        if (!cancelled) setError(toErrorMessage(err, 'プロフィールの取得に失敗しました。'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const applyProfileUpdate = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // 自分の自己紹介を更新する（今バージョンでは自己紹介のみ編集可能）。
  const saveBio = useCallback(
    async (bio: string): Promise<boolean> => {
      setSavingBio(true);
      setError(null);
      try {
        const updated = await updateMyProfile({ bio });
        applyProfileUpdate(updated);
        return true;
      } catch (err) {
        setError(toErrorMessage(err, 'プロフィールの更新に失敗しました。'));
        return false;
      } finally {
        setSavingBio(false);
      }
    },
    [applyProfileUpdate],
  );

  const clearError = useCallback(() => setError(null), []);

  return { profile, loading, error, applyProfileUpdate, saveBio, savingBio, clearError };
}
