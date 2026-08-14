import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFollowList } from './useFollowList';
import { fetchFollowers, fetchFollowing } from '../api/follows';
import type { UserSummary } from '../types/follow';

vi.mock('../api/follows');

const mockFetchFollowers = vi.mocked(fetchFollowers);
const mockFetchFollowing = vi.mocked(fetchFollowing);

const users: UserSummary[] = [{ id: 3, username: 'saburo', displayName: '三郎', avatarUrl: null, followedByMe: false }];

describe('useFollowList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('初期状態ではパネルは閉じておりAPIも呼ばれない', () => {
    const { result } = renderHook(() => useFollowList(2));

    expect(result.current.openPanel).toBeNull();
    expect(mockFetchFollowers).not.toHaveBeenCalled();
  });

  it('togglePanel("followers")でパネルが開きフォロワー一覧を取得する', async () => {
    mockFetchFollowers.mockResolvedValue({ users });
    const { result } = renderHook(() => useFollowList(2));

    await act(async () => {
      await result.current.togglePanel('followers');
    });

    expect(result.current.openPanel).toBe('followers');
    expect(result.current.users).toEqual(users);
    expect(mockFetchFollowers).toHaveBeenCalledWith(2);
  });

  it('togglePanel("following")でフォロー中一覧を取得する', async () => {
    mockFetchFollowing.mockResolvedValue({ users });
    const { result } = renderHook(() => useFollowList(2));

    await act(async () => {
      await result.current.togglePanel('following');
    });

    expect(result.current.openPanel).toBe('following');
    expect(mockFetchFollowing).toHaveBeenCalledWith(2);
  });

  it('開いているパネルと同じtypeでtogglePanelを呼ぶと閉じる（APIは呼ばれない）', async () => {
    mockFetchFollowers.mockResolvedValue({ users });
    const { result } = renderHook(() => useFollowList(2));
    await act(async () => {
      await result.current.togglePanel('followers');
    });
    mockFetchFollowers.mockClear();

    await act(async () => {
      await result.current.togglePanel('followers');
    });

    expect(result.current.openPanel).toBeNull();
    expect(mockFetchFollowers).not.toHaveBeenCalled();
  });

  it('取得に失敗するとerrorが設定される', async () => {
    mockFetchFollowers.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useFollowList(2));

    await act(async () => {
      await result.current.togglePanel('followers');
    });

    expect(result.current.error).toBe('一覧の取得に失敗しました。');
  });

  it('userIdがnullならパネルは開くがAPIは呼ばれない', async () => {
    const { result } = renderHook(() => useFollowList(null));

    await act(async () => {
      await result.current.togglePanel('followers');
    });

    expect(result.current.openPanel).toBe('followers');
    expect(mockFetchFollowers).not.toHaveBeenCalled();
  });

  it('表示中の利用者が変わると、開いていたパネルが閉じ一覧がリセットされる', async () => {
    mockFetchFollowers.mockResolvedValue({ users });
    const { result, rerender } = renderHook(({ userId }) => useFollowList(userId), { initialProps: { userId: 2 } });
    await act(async () => {
      await result.current.togglePanel('followers');
    });
    expect(result.current.openPanel).toBe('followers');

    rerender({ userId: 3 });

    expect(result.current.openPanel).toBeNull();
    expect(result.current.users).toEqual([]);
  });

  it('古いリクエストの応答は、新しいリクエストが発行された後に返ってきても一覧を上書きしない', async () => {
    let resolveFirst: (res: { users: UserSummary[] }) => void = () => {};
    const firstPromise = new Promise<{ users: UserSummary[] }>((resolve) => {
      resolveFirst = resolve;
    });
    mockFetchFollowers.mockReturnValueOnce(firstPromise);
    const { result } = renderHook(() => useFollowList(2));

    let firstToggle!: Promise<void>;
    act(() => {
      firstToggle = result.current.togglePanel('followers');
    });

    // 開いたまま閉じずに、userId変更等がなくとも同じtypeへの2回目の要求は想定していないため、
    // ここではパネルを閉じてから同じtypeで開き直し、新しいリクエストを発行する
    await act(async () => {
      await result.current.togglePanel('followers'); // 閉じる
    });
    mockFetchFollowers.mockResolvedValueOnce({ users });
    await act(async () => {
      await result.current.togglePanel('followers'); // 新しいリクエストが発行される
    });
    expect(result.current.users).toEqual(users);

    // 最初のリクエスト（古い）がここで返ってくるが、無視される
    await act(async () => {
      resolveFirst({ users: [{ id: 99, username: 'furui', displayName: '古い', avatarUrl: null, followedByMe: false }] });
      await firstToggle;
    });

    expect(result.current.users).toEqual(users);
  });
});
