import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostForm } from './PostForm';

function renderForm(overrides: Partial<React.ComponentProps<typeof PostForm>> = {}) {
  return render(
    <PostForm
      avatarUrl={null}
      onSubmit={vi.fn().mockResolvedValue(true)}
      submitting={false}
      onOpenProfile={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PostForm', () => {
  it('自分のアイコンを押すとonOpenProfileが呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenProfile = vi.fn();
    renderForm({ onOpenProfile });

    await user.click(screen.getByRole('button', { name: '自分のプロフィールを表示' }));

    expect(onOpenProfile).toHaveBeenCalled();
  });

  it('未入力のときは投稿ボタンが無効になる', () => {
    renderForm();

    expect(screen.getByRole('button', { name: '投稿' })).toBeDisabled();
  });

  it('入力すると投稿ボタンが有効になる', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('投稿内容'), 'こんにちは');

    expect(screen.getByRole('button', { name: '投稿' })).not.toBeDisabled();
  });

  it('投稿ボタンを押すとonSubmitがtrimした内容と画像で呼ばれる', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText('投稿内容'), '  はじめての投稿  ');
    await user.click(screen.getByRole('button', { name: '投稿' }));

    expect(onSubmit).toHaveBeenCalledWith('はじめての投稿', []);
  });

  it('投稿が成功すると入力内容がクリアされる', async () => {
    const user = userEvent.setup();
    renderForm({ onSubmit: vi.fn().mockResolvedValue(true) });

    const textarea = screen.getByLabelText('投稿内容');
    await user.type(textarea, 'はじめての投稿');
    await user.click(screen.getByRole('button', { name: '投稿' }));

    expect(textarea).toHaveValue('');
  });

  it('投稿が失敗すると入力内容は保持される', async () => {
    const user = userEvent.setup();
    renderForm({ onSubmit: vi.fn().mockResolvedValue(false) });

    const textarea = screen.getByLabelText('投稿内容');
    await user.type(textarea, '失敗する投稿');
    await user.click(screen.getByRole('button', { name: '投稿' }));

    expect(textarea).toHaveValue('失敗する投稿');
  });

  it('画像を選択すると投稿時にonSubmitへ渡される', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderForm({ onSubmit });
    const file = new File(['dummy'], 'a.jpg', { type: 'image/jpeg' });

    await user.upload(screen.getByLabelText(/画像を選択/), file);
    await user.type(screen.getByLabelText('投稿内容'), '画像付き投稿');
    await user.click(screen.getByRole('button', { name: '投稿' }));

    expect(onSubmit).toHaveBeenCalledWith('画像付き投稿', [file]);
  });

  it('submitting=trueのときは入力欄・投稿ボタンともに無効になる', async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm({ submitting: false, avatarUrl: null, onOpenProfile: vi.fn() });
    await user.type(screen.getByLabelText('投稿内容'), '送信中の投稿');

    rerender(
      <PostForm avatarUrl={null} onSubmit={vi.fn()} submitting={true} onOpenProfile={vi.fn()} />,
    );

    expect(screen.getByLabelText('投稿内容')).toBeDisabled();
    expect(screen.getByRole('button', { name: '投稿' })).toBeDisabled();
  });
});
