import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostDetailView } from './PostDetailView';
import { post } from '../testUtils/postFixture';
import type { Comment } from '../types/comment';

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 1,
    postId: 1,
    userId: 2,
    username: 'jiro',
    displayName: '次郎',
    avatarUrl: null,
    content: 'コメント本文',
    isOwnedByMe: false,
    ...overrides,
  };
}

function renderView(overrides: Partial<React.ComponentProps<typeof PostDetailView>> = {}) {
  return render(
    <PostDetailView
      post={post()}
      onBack={vi.fn()}
      onEdit={vi.fn().mockResolvedValue(true)}
      onDelete={vi.fn().mockResolvedValue(true)}
      onToggleLike={vi.fn()}
      isTogglingLike={false}
      comments={[]}
      commentsLoading={false}
      commentSubmitting={false}
      deletingCommentId={null}
      onAddComment={vi.fn().mockResolvedValue(true)}
      onDeleteComment={vi.fn().mockResolvedValue(true)}
      currentUserAvatarUrl={null}
      {...overrides}
    />,
  );
}

describe('PostDetailView', () => {
  it('デフォルトでは「← タイムラインに戻る」を表示し、押すとonBackが呼ばれる', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderView({ onBack });

    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('backLabelを渡すと戻るリンクの表示が変わる', () => {
    renderView({ backLabel: 'プロフィール' });

    expect(screen.getByRole('button', { name: '← プロフィールに戻る' })).toBeInTheDocument();
  });

  it('投稿本文が表示される', () => {
    renderView({ post: post({ content: '詳細ビューの本文' }) });

    expect(screen.getByText('詳細ビューの本文')).toBeInTheDocument();
  });

  it('詳細ビュー自身の中ではコメント数はリンクにならない（二重遷移防止）', () => {
    renderView({ post: post({ commentCount: 3 }) });

    expect(screen.queryByRole('button', { name: 'コメント 3' })).not.toBeInTheDocument();
    expect(screen.getByText(/コメント 3/)).toBeInTheDocument();
  });

  it('いいねボタンを押すとonToggleLikeがpostで呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggleLike = vi.fn();
    const target = post({ likeCount: 0, likedByMe: false });
    renderView({ post: target, onToggleLike });

    await user.click(screen.getByRole('button', { name: 'いいね 0' }));

    expect(onToggleLike).toHaveBeenCalledWith(target);
  });

  it('commentsLoading=trueのときは読み込み中と表示しコメント一覧は表示しない', () => {
    renderView({ commentsLoading: true, comments: [comment({ content: '既存のコメント' })] });

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('既存のコメント')).not.toBeInTheDocument();
  });

  it('commentsLoading=falseでcommentsが空ならコメント一覧の空メッセージを表示する', () => {
    renderView({ commentsLoading: false, comments: [] });

    expect(screen.getByText('まだコメントがありません。')).toBeInTheDocument();
  });

  it('commentsがあれば一覧表示する', () => {
    renderView({ comments: [comment({ content: '既存のコメント' })] });

    expect(screen.getByText('既存のコメント')).toBeInTheDocument();
  });

  it('コメントフォームから送信するとonAddCommentが呼ばれる', async () => {
    const user = userEvent.setup();
    const onAddComment = vi.fn().mockResolvedValue(true);
    renderView({ onAddComment });

    await user.type(screen.getByLabelText('コメント内容'), '新しいコメント');
    await user.click(screen.getByRole('button', { name: 'コメントする' }));

    expect(onAddComment).toHaveBeenCalledWith('新しいコメント');
  });

  it('自分のコメントの削除ボタンを押すとonDeleteCommentが呼ばれる', async () => {
    const user = userEvent.setup();
    const onDeleteComment = vi.fn().mockResolvedValue(true);
    renderView({ comments: [comment({ id: 5, isOwnedByMe: true })], onDeleteComment });

    // 投稿自体にも「削除」ボタンがあるため、コメント一覧のスコープに絞って確認する
    const commentList = document.querySelector<HTMLElement>('.comment-list');
    if (!commentList) throw new Error('comment-list not found');
    await user.click(screen.getAllByRole('button', { name: '削除' }).find((btn) => commentList.contains(btn))!);

    expect(onDeleteComment).toHaveBeenCalledWith(5);
  });

  it('deletingCommentIdに一致するコメントの削除ボタンが無効になる', () => {
    renderView({ comments: [comment({ id: 5, isOwnedByMe: true })], deletingCommentId: 5 });

    const commentList = document.querySelector<HTMLElement>('.comment-list');
    if (!commentList) throw new Error('comment-list not found');
    expect(screen.getAllByRole('button', { name: '削除' }).find((btn) => commentList.contains(btn))).toBeDisabled();
  });

  it('onOpenProfileはPostItem・CommentListの双方に渡される', async () => {
    const user = userEvent.setup();
    const onOpenProfile = vi.fn();
    renderView({
      post: post({ userId: 2, displayName: '投稿者' }),
      comments: [comment({ userId: 3, displayName: 'コメント者' })],
      onOpenProfile,
    });

    await user.click(screen.getByRole('button', { name: '投稿者' }));
    expect(onOpenProfile).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'コメント者' }));
    expect(onOpenProfile).toHaveBeenCalledWith(3);
  });
});
