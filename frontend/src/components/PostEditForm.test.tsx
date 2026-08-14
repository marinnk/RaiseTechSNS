import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostEditForm } from './PostEditForm';
import { MAX_POST_CONTENT_LENGTH } from '../utils/postContent';
import type { PostImage } from '../types/post';

const existingImages: PostImage[] = [{ id: 1, imageUrl: 'https://example.com/old.jpg' }];

function renderForm(overrides: Partial<React.ComponentProps<typeof PostEditForm>> = {}) {
  return render(
    <PostEditForm
      initialContent="編集前の本文"
      initialImages={[]}
      submitting={false}
      onCancel={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
      {...overrides}
    />,
  );
}

describe('PostEditForm', () => {
  it('initialContentが投稿内容欄にプリフィルされる', () => {
    renderForm({ initialContent: '既存の投稿本文' });

    expect(screen.getByLabelText('投稿内容')).toHaveValue('既存の投稿本文');
  });

  it('initialImagesが既存画像として表示される', () => {
    renderForm({ initialImages: existingImages });

    expect(screen.getByAltText('添付画像')).toHaveAttribute('src', 'https://example.com/old.jpg');
  });

  it('保存を押すとonSaveがtrimした内容・keepImageIds・newImagesで呼ばれる', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({ initialContent: '編集前', onSave });

    const textarea = screen.getByLabelText('投稿内容');
    await user.clear(textarea);
    await user.type(textarea, '  編集後  ');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('編集後', [], []);
  });

  it('キャンセルを押すとonCancelが呼ばれる（onSaveは呼ばれない）', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSave = vi.fn();
    renderForm({ onCancel, onSave });

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('本文が280文字（上限）ちょうどなら保存ボタンは有効（境界値）', async () => {
    const user = userEvent.setup();
    renderForm({ initialContent: '' });
    const textarea = screen.getByLabelText('投稿内容');

    await user.type(textarea, 'a'.repeat(MAX_POST_CONTENT_LENGTH));

    expect(screen.getByRole('button', { name: '保存' })).not.toBeDisabled();
  });

  it('本文が空（trim後）なら保存ボタンは無効', () => {
    renderForm({ initialContent: '' });

    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('既存画像を削除してから保存すると、そのidがkeepImageIdsから除かれる', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({
      initialContent: '本文',
      initialImages: [
        { id: 1, imageUrl: 'https://example.com/a.jpg' },
        { id: 2, imageUrl: 'https://example.com/b.jpg' },
      ],
      onSave,
    });

    const removeButtons = screen.getAllByRole('button', { name: 'この画像を削除' });
    await user.click(removeButtons[0]);
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('本文', [2], []);
  });

  it('新規画像を追加してから保存すると、newImagesに含まれる', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderForm({ initialContent: '本文', onSave });
    const file = new File(['dummy'], 'new.jpg', { type: 'image/jpeg' });

    await user.upload(screen.getByLabelText(/画像を選択/), file);
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith('本文', [], [file]);
  });

  it('submitting=trueのとき保存・キャンセルともに無効になる', () => {
    renderForm({ submitting: true });

    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
  });
});
