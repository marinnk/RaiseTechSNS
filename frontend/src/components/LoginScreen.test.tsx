import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('タイトルと入力項目を表示する', () => {
    render(<LoginScreen onSubmit={vi.fn()} onSwitchToSignup={vi.fn()} submitting={false} error={null} />);

    expect(screen.getByRole('heading', { name: 'RaiseTechSNS' })).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
  });

  it('未入力では「ログイン」ボタンが無効になる', () => {
    render(<LoginScreen onSubmit={vi.fn()} onSwitchToSignup={vi.fn()} submitting={false} error={null} />);

    expect(screen.getByRole('button', { name: 'ログイン' })).toBeDisabled();
  });

  it('メールとパスワードを入力して送信するとonSubmitが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<LoginScreen onSubmit={onSubmit} onSwitchToSignup={vi.fn()} submitting={false} error={null} />);

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password1');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'taro@example.com', password: 'password1' });
  });

  it('エラーが渡された場合はエラーメッセージを表示する', () => {
    render(
      <LoginScreen
        onSubmit={vi.fn()}
        onSwitchToSignup={vi.fn()}
        submitting={false}
        error="email or password is incorrect"
      />,
    );

    expect(screen.getByText('email or password is incorrect')).toBeInTheDocument();
  });

  it('submittingがtrueのときボタンが無効になる', () => {
    render(<LoginScreen onSubmit={vi.fn()} onSwitchToSignup={vi.fn()} submitting={true} error={null} />);

    expect(screen.getByRole('button', { name: 'ログイン' })).toBeDisabled();
  });

  it('「新規登録はこちら」をクリックするとonSwitchToSignupが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSwitchToSignup = vi.fn();
    render(<LoginScreen onSubmit={vi.fn()} onSwitchToSignup={onSwitchToSignup} submitting={false} error={null} />);

    await user.click(screen.getByRole('button', { name: '新規登録はこちら' }));

    expect(onSwitchToSignup).toHaveBeenCalled();
  });
});
