import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostItem } from './PostItem';
import { post } from '../testUtils/postFixture';
import { formatDate } from '../utils/formatDate';

function renderPostItem(overrides: Partial<React.ComponentProps<typeof PostItem>> = {}) {
  return render(
    <PostItem
      post={post()}
      onEdit={vi.fn().mockResolvedValue(true)}
      onDelete={vi.fn().mockResolvedValue(true)}
      onToggleLike={vi.fn()}
      isTogglingLike={false}
      {...overrides}
    />,
  );
}

describe('PostItem', () => {
  it('自分の投稿には編集・削除ボタンが表示される', () => {
    renderPostItem({ post: post({ isOwnedByMe: true }) });

    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('他人の投稿には編集・削除ボタンが表示されない', () => {
    renderPostItem({ post: post({ isOwnedByMe: false }) });

    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
  });

  it('onOpenProfileを渡すと投稿者名がボタンになりクリックでuserIdが渡される', async () => {
    const user = userEvent.setup();
    const onOpenProfile = vi.fn();
    renderPostItem({ post: post({ userId: 5, displayName: '次郎' }), onOpenProfile });

    await user.click(screen.getByRole('button', { name: '次郎' }));

    expect(onOpenProfile).toHaveBeenCalledWith(5);
  });

  it('onOpenProfileを渡さないと投稿者名はボタンにならない', () => {
    renderPostItem({ post: post({ displayName: '次郎' }) });

    expect(screen.queryByRole('button', { name: '次郎' })).not.toBeInTheDocument();
    expect(screen.getByText('次郎')).toBeInTheDocument();
  });

  it('画像が無ければ画像グリッドは表示されない', () => {
    renderPostItem({ post: post({ images: [] }) });

    expect(screen.queryByAltText('投稿画像')).not.toBeInTheDocument();
  });

  it('画像があれば画像グリッドが表示される', () => {
    renderPostItem({ post: post({ images: [{ id: 1, imageUrl: 'https://example.com/a.jpg' }] }) });

    expect(screen.getByAltText('投稿画像')).toHaveAttribute('src', 'https://example.com/a.jpg');
  });

  it('投稿日時がformatDateでフォーマットされて表示される', () => {
    renderPostItem({ post: post({ createdAt: '2026-08-10T10:00:00' }) });

    const time = document.querySelector('time.post-date');
    expect(time).toHaveAttribute('datetime', '2026-08-10T10:00:00');
    expect(time).toHaveTextContent(formatDate('2026-08-10T10:00:00'));
  });

  it('いいね済みの投稿は♥・aria-pressed=trueで表示される', () => {
    renderPostItem({ post: post({ likeCount: 3, likedByMe: true }) });

    const likeButton = screen.getByRole('button', { name: 'いいね 3' });
    expect(likeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('未いいねの投稿は♡・aria-pressed=falseで表示される', () => {
    renderPostItem({ post: post({ likeCount: 0, likedByMe: false }) });

    const likeButton = screen.getByRole('button', { name: 'いいね 0' });
    expect(likeButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('isTogglingLike=trueのときいいねボタンが無効になる', () => {
    renderPostItem({ post: post({ likeCount: 0 }), isTogglingLike: true });

    expect(screen.getByRole('button', { name: 'いいね 0' })).toBeDisabled();
  });

  it('いいねボタンを押すとonToggleLikeがpostで呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggleLike = vi.fn();
    const target = post({ likeCount: 0 });
    renderPostItem({ post: target, onToggleLike });

    await user.click(screen.getByRole('button', { name: 'いいね 0' }));

    expect(onToggleLike).toHaveBeenCalledWith(target);
  });

  it('onOpenDetailを渡すとコメント数がリンクになりクリックでpostIdが渡される', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    renderPostItem({ post: post({ id: 7, commentCount: 2 }), onOpenDetail });

    await user.click(screen.getByRole('button', { name: 'コメント 2' }));

    expect(onOpenDetail).toHaveBeenCalledWith(7);
  });

  it('onOpenDetailを渡さないとコメント数はリンクにならない', () => {
    renderPostItem({ post: post({ commentCount: 2 }) });

    expect(screen.queryByRole('button', { name: 'コメント 2' })).not.toBeInTheDocument();
    expect(screen.getByText(/コメント 2/)).toBeInTheDocument();
  });

  it('「編集」を押すと編集モーダルが開き、既存の内容がプリフィルされる', async () => {
    const user = userEvent.setup();
    renderPostItem({ post: post({ isOwnedByMe: true, content: '編集前の本文' }) });

    await user.click(screen.getByRole('button', { name: '編集' }));

    const dialog = screen.getByRole('dialog', { name: '投稿を編集' });
    expect(within(dialog).getByLabelText('投稿内容')).toHaveValue('編集前の本文');
  });

  it('編集モーダルで保存が成功するとonEditが呼ばれモーダルが閉じる', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(true);
    renderPostItem({ post: post({ id: 3, isOwnedByMe: true, content: '編集前' }), onEdit });

    await user.click(screen.getByRole('button', { name: '編集' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を編集' });
    const textarea = within(dialog).getByLabelText('投稿内容');
    await user.clear(textarea);
    await user.type(textarea, '編集後');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(onEdit).toHaveBeenCalledWith(3, '編集後', [], []);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('編集モーダルで保存が失敗するとモーダルは開いたまま', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn().mockResolvedValue(false);
    renderPostItem({ post: post({ isOwnedByMe: true, content: '編集前' }), onEdit });

    await user.click(screen.getByRole('button', { name: '編集' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を編集' });
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(screen.getByRole('dialog', { name: '投稿を編集' })).toBeInTheDocument();
  });

  it('「削除」を押すと確認モーダルが開く', async () => {
    const user = userEvent.setup();
    renderPostItem({ post: post({ isOwnedByMe: true }) });

    await user.click(screen.getByRole('button', { name: '削除' }));

    const dialog = screen.getByRole('dialog', { name: '投稿を削除' });
    expect(within(dialog).getByText('この投稿を削除しますか？')).toBeInTheDocument();
  });

  it('削除確認モーダルで削除が成功するとonDeleteが呼ばれモーダルが閉じる', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(true);
    renderPostItem({ post: post({ id: 9, isOwnedByMe: true }), onDelete });

    await user.click(screen.getByRole('button', { name: '削除' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を削除' });
    await user.click(within(dialog).getByRole('button', { name: '削除' }));

    expect(onDelete).toHaveBeenCalledWith(9);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('削除確認モーダルで削除が失敗するとモーダルは開いたまま', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(false);
    renderPostItem({ post: post({ isOwnedByMe: true }), onDelete });

    await user.click(screen.getByRole('button', { name: '削除' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を削除' });
    await user.click(within(dialog).getByRole('button', { name: '削除' }));

    expect(screen.getByRole('dialog', { name: '投稿を削除' })).toBeInTheDocument();
  });

  it('削除確認モーダルで「キャンセル」を押すとonDeleteを呼ばずモーダルが閉じる', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderPostItem({ post: post({ isOwnedByMe: true }), onDelete });

    await user.click(screen.getByRole('button', { name: '削除' }));
    const dialog = screen.getByRole('dialog', { name: '投稿を削除' });
    await user.click(within(dialog).getByRole('button', { name: 'キャンセル' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
