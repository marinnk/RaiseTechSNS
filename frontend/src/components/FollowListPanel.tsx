import type { FollowListType } from '../hooks/useFollowList';
import type { UserSummary } from '../types/follow';

interface FollowListPanelProps {
  type: FollowListType;
  users: UserSummary[];
  loading: boolean;
  onSelectUser: (userId: number) => void;
}

const EMPTY_MESSAGE: Record<FollowListType, string> = {
  following: 'フォロー中の利用者がいません。',
  followers: 'フォロワーがいません。',
};

// プロフィール画面の「フォロー中」「フォロワー」人数をクリックしたときに展開される一覧パネル。
// プロトタイプと同じく、別画面・別URLへは遷移せず同じ画面内に展開する。
export function FollowListPanel({ type, users, loading, onSelectUser }: FollowListPanelProps) {
  return (
    <div className="follow-list-panel">
      {loading ? (
        <p className="text-sub">読み込み中...</p>
      ) : users.length === 0 ? (
        <p className="text-sub">{EMPTY_MESSAGE[type]}</p>
      ) : (
        <ul className="follow-list">
          {users.map((user) => (
            <li key={user.id}>
              <button type="button" className="follow-list-item" onClick={() => onSelectUser(user.id)}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="avatar-icon-sm" />
                ) : (
                  <span className="avatar-icon-sm avatar-icon-placeholder" aria-hidden="true" />
                )}
                <span className="follow-list-display-name">{user.displayName}</span>
                <span className="follow-list-username">@{user.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
