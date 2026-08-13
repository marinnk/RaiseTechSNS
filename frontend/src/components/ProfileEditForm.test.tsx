import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileEditForm } from './ProfileEditForm';

function jpegFile(name = 'avatar.jpg') {
  return new File(['dummy'], name, { type: 'image/jpeg' });
}

describe('ProfileEditForm', () => {
  beforeEach(() => {
    // jsdomはURL.createObjectURL/revokeObjectURLを実装していないため、プレビュー表示のためにモックする
    URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('画像を選択するとonUploadAvatarが選択したファイルで呼ばれる', async () => {
    const user = userEvent.setup();
    const onUploadAvatar = vi.fn().mockResolvedValue(true);
    render(
      <ProfileEditForm
        initialBio=""
        avatarUrl={null}
        submitting={false}
        avatarSubmitting={false}
        onCancel={() => {}}
        onSave={vi.fn().mockResolvedValue(true)}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={vi.fn().mockResolvedValue(true)}
      />,
    );
    const file = jpegFile();

    await user.upload(screen.getByLabelText('アイコン画像を選択'), file);

    expect(onUploadAvatar).toHaveBeenCalledWith(file);
  });

  it('avatarUrlがあれば画像が表示され、削除ボタン押下でonRemoveAvatarが呼ばれる', async () => {
    const user = userEvent.setup();
    const onRemoveAvatar = vi.fn().mockResolvedValue(true);
    render(
      <ProfileEditForm
        initialBio=""
        avatarUrl="https://example.com/avatars/current.jpg"
        submitting={false}
        avatarSubmitting={false}
        onCancel={() => {}}
        onSave={vi.fn().mockResolvedValue(true)}
        onUploadAvatar={vi.fn().mockResolvedValue(true)}
        onRemoveAvatar={onRemoveAvatar}
      />,
    );

    expect(screen.getByRole('img', { name: 'アイコンのプレビュー' })).toHaveAttribute(
      'src',
      'https://example.com/avatars/current.jpg',
    );

    await user.click(screen.getByRole('button', { name: '画像を削除' }));

    expect(onRemoveAvatar).toHaveBeenCalled();
  });

  it('avatarUrlがnullのときはプレースホルダー表示になり削除ボタンは表示されない', () => {
    render(
      <ProfileEditForm
        initialBio=""
        avatarUrl={null}
        submitting={false}
        avatarSubmitting={false}
        onCancel={() => {}}
        onSave={vi.fn().mockResolvedValue(true)}
        onUploadAvatar={vi.fn().mockResolvedValue(true)}
        onRemoveAvatar={vi.fn().mockResolvedValue(true)}
      />,
    );

    expect(screen.queryByRole('img', { name: 'アイコンのプレビュー' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '画像を削除' })).not.toBeInTheDocument();
  });

  it('不正な形式のファイルを選択するとエラーメッセージが表示されonUploadAvatarは呼ばれない', async () => {
    // input[accept]によるブラウザ側フィルタを無効にし、実際の検証（validateImageFile）が
    // 効いていることを確認する（OSのファイル選択ダイアログでは「すべてのファイル」を選べば
    // accept属性を回避できるため、クライアント側の検証にも意味がある）
    const user = userEvent.setup({ applyAccept: false });
    const onUploadAvatar = vi.fn();
    render(
      <ProfileEditForm
        initialBio=""
        avatarUrl={null}
        submitting={false}
        avatarSubmitting={false}
        onCancel={() => {}}
        onSave={vi.fn().mockResolvedValue(true)}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={vi.fn().mockResolvedValue(true)}
      />,
    );
    const textFile = new File(['dummy'], 'note.txt', { type: 'text/plain' });

    await user.upload(screen.getByLabelText('アイコン画像を選択'), textFile);

    expect(screen.getByRole('alert')).toHaveTextContent('画像はjpgまたはpng形式のみ選択できます。');
    expect(onUploadAvatar).not.toHaveBeenCalled();
  });

  it('5MBを超えるファイルを選択するとエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    const onUploadAvatar = vi.fn();
    render(
      <ProfileEditForm
        initialBio=""
        avatarUrl={null}
        submitting={false}
        avatarSubmitting={false}
        onCancel={() => {}}
        onSave={vi.fn().mockResolvedValue(true)}
        onUploadAvatar={onUploadAvatar}
        onRemoveAvatar={vi.fn().mockResolvedValue(true)}
      />,
    );
    const tooLarge = new File([new Uint8Array(6 * 1024 * 1024)], 'avatar.jpg', { type: 'image/jpeg' });

    await user.upload(screen.getByLabelText('アイコン画像を選択'), tooLarge);

    expect(screen.getByRole('alert')).toHaveTextContent('画像は5MB以下にしてください。');
    expect(onUploadAvatar).not.toHaveBeenCalled();
  });
});
