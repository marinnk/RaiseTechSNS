import { useCallback, useRef, useState } from 'react';
import { searchUsers } from '../api/users';
import { toErrorMessage } from '../utils/apiError';
import type { UserSearchResult } from '../types/user';

/**
 * ユーザー検索画面（S07）用フック。UC09の通り、検索はキーワード入力欄の送信をトリガーにのみ
 * 実行する（デバウンスによるライブ検索はしない）。空文字（trim後）での検索は何もしない。
 */
export function useUserSearch() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useFollowListと同じく、ある検索の途中で別の検索が発行された場合、古い方の応答が
  // 後から返ってきても表示中の結果を上書きしないよう、直近のリクエストの通し番号で無視する
  const latestRequestRef = useRef(0);

  const search = useCallback(async (rawKeyword: string) => {
    const trimmed = rawKeyword.trim();
    if (!trimmed) return;

    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await searchUsers(trimmed);
      if (latestRequestRef.current !== requestId) return;
      setResults(res.users);
      setHasSearched(true);
    } catch (err) {
      if (latestRequestRef.current !== requestId) return;
      setError(toErrorMessage(err, '検索に失敗しました。'));
    } finally {
      if (latestRequestRef.current === requestId) setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { keyword, setKeyword, results, hasSearched, loading, error, search, clearError };
}
