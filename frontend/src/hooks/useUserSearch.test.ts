import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserSearch } from './useUserSearch';
import { searchUsers } from '../api/users';
import type { UserSearchResult } from '../types/user';

vi.mock('../api/users');

const mockSearchUsers = vi.mocked(searchUsers);

const jiro: UserSearchResult = { id: 2, username: 'jiro', displayName: '次郎', avatarUrl: null, followedByMe: false };

describe('useUserSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('初期状態では未検索でresultsは空', () => {
    const { result } = renderHook(() => useUserSearch());

    expect(result.current.hasSearched).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('検索が成功すると結果が反映されhasSearchedがtrueになる', async () => {
    mockSearchUsers.mockResolvedValue({ users: [jiro] });
    const { result } = renderHook(() => useUserSearch());

    await act(async () => {
      await result.current.search('jiro');
    });

    expect(result.current.results).toEqual([jiro]);
    expect(result.current.hasSearched).toBe(true);
    expect(mockSearchUsers).toHaveBeenCalledWith('jiro');
  });

  it('空文字（trim後）での検索は何もしない', async () => {
    const { result } = renderHook(() => useUserSearch());

    await act(async () => {
      await result.current.search('   ');
    });

    expect(mockSearchUsers).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  it('前後の空白はtrimされて検索される', async () => {
    mockSearchUsers.mockResolvedValue({ users: [jiro] });
    const { result } = renderHook(() => useUserSearch());

    await act(async () => {
      await result.current.search('  jiro  ');
    });

    expect(mockSearchUsers).toHaveBeenCalledWith('jiro');
  });

  it('検索が失敗するとerrorが設定される', async () => {
    mockSearchUsers.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useUserSearch());

    await act(async () => {
      await result.current.search('jiro');
    });

    expect(result.current.error).toBe('検索に失敗しました。');
    expect(result.current.hasSearched).toBe(false);
  });

  it('古い検索の応答は、新しい検索が発行された後に返ってきても結果を上書きしない', async () => {
    let resolveFirst: (res: { users: UserSearchResult[] }) => void = () => {};
    const firstPromise = new Promise<{ users: UserSearchResult[] }>((resolve) => {
      resolveFirst = resolve;
    });
    mockSearchUsers.mockReturnValueOnce(firstPromise);
    const { result } = renderHook(() => useUserSearch());

    let firstSearch!: Promise<void>;
    act(() => {
      firstSearch = result.current.search('old');
    });

    const secondResult = { users: [jiro] };
    mockSearchUsers.mockResolvedValueOnce(secondResult);
    await act(async () => {
      await result.current.search('jiro');
    });
    expect(result.current.results).toEqual([jiro]);

    await act(async () => {
      resolveFirst({ users: [{ ...jiro, id: 99, displayName: '古い結果' }] });
      await firstSearch;
    });

    expect(result.current.results).toEqual([jiro]);
  });

  it('setKeywordで入力中のキーワードを更新できる', () => {
    const { result } = renderHook(() => useUserSearch());

    act(() => {
      result.current.setKeyword('jiro');
    });

    expect(result.current.keyword).toBe('jiro');
  });

  it('clearErrorでerrorがnullになる', async () => {
    mockSearchUsers.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useUserSearch());
    await act(async () => {
      await result.current.search('jiro');
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
