import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostCreateButton } from './PostCreateButton';

function renderButton(overrides: Partial<React.ComponentProps<typeof PostCreateButton>> = {}) {
  return render(
    <PostCreateButton
      avatarUrl={null}
      onSubmit={vi.fn().mockResolvedValue(true)}
      submitting={false}
      error={null}
      onClearError={vi.fn()}
      onOpenProfile={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PostCreateButton', () => {
  it('初期状態（閉）ではモーダルは表示されない', () => {
    renderButton();

    expect(screen.getByRole('button', { name: '投稿を作成する' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ボタンを押すと（開）投稿作成モーダルが表示される', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));

    expect(screen.getByRole('dialog', { name: '投稿を作成' })).toBeInTheDocument();
  });

  it('errorがあればモーダル内にアラートとして表示される', async () => {
    const user = userEvent.setup();
    renderButton({ error: '投稿に失敗しました。' });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));

    const dialog = screen.getByRole('dialog', { name: '投稿を作成' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('投稿に失敗しました。');
  });

  it('errorの「閉じる」を押すとonClearErrorが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClearError = vi.fn();
    renderButton({ error: '投稿に失敗しました。', onClearError });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を作成' });
    await user.click(within(dialog).getByRole('button', { name: '閉じる' }));

    expect(onClearError).toHaveBeenCalled();
  });

  it('送信中（submitting）はEscapeキーでモーダルを閉じられない', async () => {
    const user = userEvent.setup();
    renderButton({ submitting: true });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: '投稿を作成' })).toBeInTheDocument();
  });

  it('送信していないときはEscapeキーでモーダルを閉じられる', async () => {
    const user = userEvent.setup();
    renderButton({ submitting: false });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('投稿が成功する（送信中→成功）とモーダルが閉じる', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderButton({ onSubmit });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を作成' });
    await user.type(within(dialog).getByLabelText('投稿内容'), 'はじめての投稿');
    await user.click(within(dialog).getByRole('button', { name: '投稿' }));

    expect(onSubmit).toHaveBeenCalledWith('はじめての投稿', []);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('投稿が失敗する（送信中→失敗）とモーダルは開いたまま', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(false);
    renderButton({ onSubmit });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を作成' });
    await user.type(within(dialog).getByLabelText('投稿内容'), '失敗する投稿');
    await user.click(within(dialog).getByRole('button', { name: '投稿' }));

    expect(screen.getByRole('dialog', { name: '投稿を作成' })).toBeInTheDocument();
  });

  it('モーダルを閉じるとonClearErrorが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClearError = vi.fn();
    renderButton({ onClearError });

    await user.click(screen.getByRole('button', { name: '投稿を作成する' }));
    await user.keyboard('{Escape}');

    expect(onClearError).toHaveBeenCalled();
  });
});
