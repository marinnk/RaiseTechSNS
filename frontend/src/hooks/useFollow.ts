import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { followUser, unfollowUser } from '../api/follows';
import type { Profile } from '../types/profile';

/**
 * フォロー・フォロー解除のトグル操作を提供するフック。followedByMe/followerCountの実体は
 * useProfile側のprofile（唯一の情報源）が持ち、このフックは更新関数（applyProfileUpdate）を
 * 通じてそこを書き換えるだけ。useLikesと同じく、押した瞬間に見た目を変える楽観的更新を行い、
 * APIが失敗したら元の状態にロールバックする。
 *
 * いいねAPIと同じ理由で、フォローAPIもトグル式ではなく冪等なPOST/DELETEの2エンドポイントの
 * ため、現在の状態（followedByMe）を見てどちらを呼ぶか決める。
 */
export function useFollow(applyProfileUpdate: (patch: { followedByMe: boolean; followerCount: number }) => void) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFollow = useCallback(
    async (profile: Pick<Profile, 'id' | 'followedByMe' | 'followerCount'>) => {
      const previous = { followedByMe: profile.followedByMe, followerCount: profile.followerCount };
      const optimistic = profile.followedByMe
        ? { followedByMe: false, followerCount: profile.followerCount - 1 }
        : { followedByMe: true, followerCount: profile.followerCount + 1 };

      setSubmitting(true);
      applyProfileUpdate(optimistic);
      setError(null);
      try {
        const result = profile.followedByMe ? await unfollowUser(profile.id) : await followUser(profile.id);
        // サーバー側の値で確定させる
        applyProfileUpdate(result);
      } catch (err) {
        applyProfileUpdate(previous);
        setError(err instanceof ApiError ? err.message : 'フォロー処理に失敗しました。');
      } finally {
        setSubmitting(false);
      }
    },
    [applyProfileUpdate],
  );

  const clearError = useCallback(() => setError(null), []);

  return { toggleFollow, submitting, error, clearError };
}
