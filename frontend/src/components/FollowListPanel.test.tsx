import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FollowListPanel } from './FollowListPanel';
import type { UserSummary } from '../types/follow';

const users: UserSummary[] = [
  { id: 1, username: 'jiro', displayName: '次郎', avatarUrl: 'https://example.com/jiro.jpg', followedByMe: false },
];

describe('FollowListPanel', () => {
  it('loading=trueのときは読み込み中と表示する', () => {
    render(<FollowListPanel type="followers" users={[]} loading={true} onSelectUser={vi.fn()} />);

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('followersが空なら「フォロワーがいません。」と表示する', () => {
    render(<FollowListPanel type="followers" users={[]} loading={false} onSelectUser={vi.fn()} />);

    expect(screen.getByText('フォロワーがいません。')).toBeInTheDocument();
  });

  it('followingが空なら「フォロー中の利用者がいません。」と表示する', () => {
    render(<FollowListPanel type="following" users={[]} loading={false} onSelectUser={vi.fn()} />);

    expect(screen.getByText('フォロー中の利用者がいません。')).toBeInTheDocument();
  });

  it('利用者がいれば一覧表示する', () => {
    render(<FollowListPanel type="followers" users={users} loading={false} onSelectUser={vi.fn()} />);

    expect(screen.getByText('次郎')).toBeInTheDocument();
    expect(screen.getByText('@jiro')).toBeInTheDocument();
  });

  it('利用者をクリックするとonSelectUserがそのidで呼ばれる', async () => {
    const user = userEvent.setup();
    const onSelectUser = vi.fn();
    render(<FollowListPanel type="followers" users={users} loading={false} onSelectUser={onSelectUser} />);

    await user.click(screen.getByRole('button', { name: /次郎/ }));

    expect(onSelectUser).toHaveBeenCalledWith(1);
  });
});
