import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignupScreen } from './SignupScreen';

describe('SignupScreen', () => {
  it('タイトルと入力項目を表示する', () => {
    render(<SignupScreen onSubmit={vi.fn()} onSwitchToLogin={vi.fn()} submitting={false} error={null} />);

    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByLabelText('ユーザー名')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
  });

  it('未入力では「登録する」ボタンが無効になる', () => {
    render(<SignupScreen onSubmit={vi.fn()} onSwitchToLogin={vi.fn()} submitting={false} error={null} />);

    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();
  });

  it('3項目を入力して送信するとonSubmitが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<SignupScreen onSubmit={onSubmit} onSwitchToLogin={vi.fn()} submitting={false} error={null} />);

    await user.type(screen.getByLabelText('ユーザー名'), 'taro');
    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password1');
    await user.click(screen.getByRole('button', { name: '登録する' }));

    expect(onSubmit).toHaveBeenCalledWith({
      username: 'taro',
      email: 'taro@example.com',
      password: 'password1',
    });
  });

  it('エラーが渡された場合はエラーメッセージを表示する', () => {
    render(
      <SignupScreen
        onSubmit={vi.fn()}
        onSwitchToLogin={vi.fn()}
        submitting={false}
        error="email is already registered"
      />,
    );

    expect(screen.getByText('email is already registered')).toBeInTheDocument();
  });

  it('「ログイン画面に戻る」をクリックするとonSwitchToLoginが呼ばれる', async () => {
    const user = userEvent.setup();
    const onSwitchToLogin = vi.fn();
    render(<SignupScreen onSubmit={vi.fn()} onSwitchToLogin={onSwitchToLogin} submitting={false} error={null} />);

    await user.click(screen.getByRole('button', { name: 'ログイン画面に戻る' }));

    expect(onSwitchToLogin).toHaveBeenCalled();
  });
});
