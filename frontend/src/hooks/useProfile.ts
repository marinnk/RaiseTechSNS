import { useCallback, useEffect, useState } from 'react';
import { deleteMyAvatar, fetchProfile, updateMyProfile, uploadMyAvatar } from '../api/profile';
import { toErrorMessage } from '../utils/apiError';
import type { Profile } from '../types/profile';

/**
 * プロフィール画面で表示中の利用者（userId）のプロフィールを取得するフック。
 * userIdがnull（プロフィール画面を表示していない）の間はフェッチしない。
 *
 * フォロー操作（useFollow）・自己紹介の更新の結果を画面へ反映できるよう、profileを
 * 直接書き換えるapplyProfileUpdateを公開する（usePostStore.applyLikeUpdateと同じ設計）。
 *
 * @param onOwnAvatarChange アバター画像の登録・削除（`/api/users/me/avatar`）が成功するたびに
 *   呼ばれる。このエンドポイントは常にログイン中利用者自身が対象のため、呼ばれた時点で
 *   「自分のアバター画像」が変わったとみなせる。ヘッダー等で使うuseAuthのuserにも
 *   反映したい場合に指定する
 */
export function useProfile(userId: number | null, onOwnAvatarChange?: (avatarUrl: string | null) => void) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingBio, setSavingBio] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

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

  // 自分のアバター画像を登録・上書きする。
  const uploadAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      setSavingAvatar(true);
      setError(null);
      try {
        const updated = await uploadMyAvatar(file);
        applyProfileUpdate(updated);
        onOwnAvatarChange?.(updated.avatarUrl);
        return true;
      } catch (err) {
        setError(toErrorMessage(err, 'プロフィール画像の更新に失敗しました。'));
        return false;
      } finally {
        setSavingAvatar(false);
      }
    },
    [applyProfileUpdate, onOwnAvatarChange],
  );

  // 自分のアバター画像を削除する。
  const removeAvatar = useCallback(async (): Promise<boolean> => {
    setSavingAvatar(true);
    setError(null);
    try {
      const updated = await deleteMyAvatar();
      applyProfileUpdate(updated);
      onOwnAvatarChange?.(updated.avatarUrl);
      return true;
    } catch (err) {
      setError(toErrorMessage(err, 'プロフィール画像の削除に失敗しました。'));
      return false;
    } finally {
      setSavingAvatar(false);
    }
  }, [applyProfileUpdate, onOwnAvatarChange]);

  const clearError = useCallback(() => setError(null), []);

  return {
    profile,
    loading,
    error,
    applyProfileUpdate,
    saveBio,
    savingBio,
    uploadAvatar,
    removeAvatar,
    savingAvatar,
    clearError,
  };
}
