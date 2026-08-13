import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostImagePicker } from './PostImagePicker';

function jpegFile(name = 'a.jpg') {
  return new File(['dummy'], name, { type: 'image/jpeg' });
}

describe('PostImagePicker', () => {
  beforeEach(() => {
    // jsdomはURL.createObjectURL/revokeObjectURLを実装していないため、プレビュー表示のためにモックする
    URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('画像を選択するとonAddFilesが選択したファイルで呼ばれる', async () => {
    const user = userEvent.setup();
    const onAddFiles = vi.fn();
    render(
      <PostImagePicker
        existingImages={[]}
        newImages={[]}
        onRemoveExisting={vi.fn()}
        onAddFiles={onAddFiles}
        onRemoveNew={vi.fn()}
        disabled={false}
      />,
    );
    const file = jpegFile();

    await user.upload(screen.getByLabelText(/画像を選択/), file);

    expect(onAddFiles).toHaveBeenCalledWith([file]);
  });

  it('既存画像・新規画像がプレビュー表示され、削除ボタンでそれぞれのコールバックが呼ばれる', async () => {
    const user = userEvent.setup();
    const onRemoveExisting = vi.fn();
    const onRemoveNew = vi.fn();
    render(
      <PostImagePicker
        existingImages={[{ id: 1, url: 'https://example.com/posts/existing.jpg' }]}
        newImages={[jpegFile('new.jpg')]}
        onRemoveExisting={onRemoveExisting}
        onAddFiles={vi.fn()}
        onRemoveNew={onRemoveNew}
        disabled={false}
      />,
    );

    const removeButtons = screen.getAllByRole('button', { name: 'この画像を削除' });
    expect(removeButtons).toHaveLength(2);

    await user.click(removeButtons[0]);
    expect(onRemoveExisting).toHaveBeenCalledWith(1);

    await user.click(removeButtons[1]);
    expect(onRemoveNew).toHaveBeenCalledWith(0);
  });

  it('既存＋新規の合計が上限を超える枚数を一度に選択するとエラーが表示されonAddFilesは呼ばれない', async () => {
    const user = userEvent.setup();
    const onAddFiles = vi.fn();
    render(
      <PostImagePicker
        existingImages={[
          { id: 1, url: 'https://example.com/1.jpg' },
          { id: 2, url: 'https://example.com/2.jpg' },
          { id: 3, url: 'https://example.com/3.jpg' },
        ]}
        newImages={[]}
        onRemoveExisting={vi.fn()}
        onAddFiles={onAddFiles}
        onRemoveNew={vi.fn()}
        disabled={false}
      />,
    );

    await user.upload(screen.getByLabelText(/画像を選択/), [jpegFile('a.jpg'), jpegFile('b.jpg')]);

    expect(screen.getByText('画像は最大4枚までです。')).toBeInTheDocument();
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it('不正な形式のファイルを選択するとエラーが表示されonAddFilesは呼ばれない', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onAddFiles = vi.fn();
    render(
      <PostImagePicker
        existingImages={[]}
        newImages={[]}
        onRemoveExisting={vi.fn()}
        onAddFiles={onAddFiles}
        onRemoveNew={vi.fn()}
        disabled={false}
      />,
    );
    const textFile = new File(['dummy'], 'note.txt', { type: 'text/plain' });

    await user.upload(screen.getByLabelText(/画像を選択/), textFile);

    expect(screen.getByText('画像はjpgまたはpng形式のみ選択できます。')).toBeInTheDocument();
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it('上限枚数に達している場合はファイル選択欄が無効になる', () => {
    render(
      <PostImagePicker
        existingImages={[
          { id: 1, url: 'https://example.com/1.jpg' },
          { id: 2, url: 'https://example.com/2.jpg' },
          { id: 3, url: 'https://example.com/3.jpg' },
          { id: 4, url: 'https://example.com/4.jpg' },
        ]}
        newImages={[]}
        onRemoveExisting={vi.fn()}
        onAddFiles={vi.fn()}
        onRemoveNew={vi.fn()}
        disabled={false}
      />,
    );

    expect(screen.getByLabelText(/画像を選択/)).toBeDisabled();
  });
});
