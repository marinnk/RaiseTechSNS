import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginSuccessScreen } from './LoginSuccessScreen';
import type { AuthUser } from '../types/auth';

const user: AuthUser = { id: 1, username: 'taro', displayName: 'たろう', email: 'taro@example.com' };

describe('LoginSuccessScreen', () => {
  it('「ログイン成功！」の見出しとユーザー情報を表示する', () => {
    render(<LoginSuccessScreen user={user} onLogout={vi.fn()} submitting={false} />);

    expect(screen.getByRole('heading', { name: 'ログイン成功！' })).toBeInTheDocument();
    expect(screen.getByText('ようこそ、たろう（@taro）さん')).toBeInTheDocument();
    expect(screen.getByText('taro@example.com')).toBeInTheDocument();
  });

  it('「ログアウト」をクリックするとonLogoutが呼ばれる', async () => {
    const userEventInstance = userEvent.setup();
    const onLogout = vi.fn();
    render(<LoginSuccessScreen user={user} onLogout={onLogout} submitting={false} />);

    await userEventInstance.click(screen.getByRole('button', { name: 'ログアウト' }));

    expect(onLogout).toHaveBeenCalled();
  });

  it('submittingがtrueのときボタンが無効になる', () => {
    render(<LoginSuccessScreen user={user} onLogout={vi.fn()} submitting={true} />);

    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeDisabled();
  });
});
