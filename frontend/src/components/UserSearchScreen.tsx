import { AvatarIcon } from './AvatarIcon';
import type { UserSearchResult } from '../types/user';

interface UserSearchScreenProps {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  results: UserSearchResult[];
  hasSearched: boolean;
  loading: boolean;
  onSearch: (keyword: string) => void;
  onBack: () => void;
  onOpenProfile: (userId: number) => void;
}

// S07 ユーザー検索画面。プロトタイプ（prototype/js/views/search.js）と同じく、入力のたびに
// 検索するのではなく、フォーム送信時にのみ検索を実行する（UC09の「キーワードが未入力の場合は
// 検索を実行しない」もこの送信のタイミングでuseUserSearch側が判定する）。
export function UserSearchScreen({
  keyword,
  onKeywordChange,
  results,
  hasSearched,
  loading,
  onSearch,
  onBack,
  onOpenProfile,
}: UserSearchScreenProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword);
  };

  return (
    <div className="search-screen">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← タイムラインに戻る
      </button>

      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="ユーザー名・表示名で検索"
          aria-label="ユーザー名・表示名で検索"
        />
        <button type="submit" className="btn">
          検索
        </button>
      </form>

      {loading ? (
        <p className="text-sub">読み込み中...</p>
      ) : hasSearched && results.length === 0 ? (
        <p className="text-sub">該当する利用者が見つかりませんでした。</p>
      ) : (
        <ul className="search-results">
          {results.map((user) => (
            <li key={user.id}>
              <button type="button" className="search-result-item" onClick={() => onOpenProfile(user.id)}>
                <AvatarIcon avatarUrl={user.avatarUrl} />
                <span className="search-result-text">
                  <span className="search-result-display-name">{user.displayName}</span>
                  <span className="search-result-username">@{user.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
