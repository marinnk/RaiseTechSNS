import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentList } from './CommentList';
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

describe('CommentList', () => {
  it('コメントが無ければ空メッセージを表示する', () => {
    render(<CommentList comments={[]} onDelete={vi.fn()} deletingCommentId={null} />);

    expect(screen.getByText('まだコメントがありません。')).toBeInTheDocument();
  });

  it('コメントがあれば一覧表示する', () => {
    render(
      <CommentList
        comments={[comment({ id: 1, content: '1件目' }), comment({ id: 2, content: '2件目' })]}
        onDelete={vi.fn()}
        deletingCommentId={null}
      />,
    );

    expect(screen.getByText('1件目')).toBeInTheDocument();
    expect(screen.getByText('2件目')).toBeInTheDocument();
  });

  it('deletingCommentIdに一致するコメントの削除ボタンだけが無効になる', () => {
    render(
      <CommentList
        comments={[
          comment({ id: 1, content: '1件目', isOwnedByMe: true }),
          comment({ id: 2, content: '2件目', isOwnedByMe: true }),
        ]}
        onDelete={vi.fn()}
        deletingCommentId={2}
      />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: '削除' });
    expect(deleteButtons[0]).not.toBeDisabled();
    expect(deleteButtons[1]).toBeDisabled();
  });

  it('削除ボタンを押すとonDeleteがそのコメントのidで呼ばれる', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <CommentList
        comments={[comment({ id: 1, isOwnedByMe: true })]}
        onDelete={onDelete}
        deletingCommentId={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('onOpenProfileは各コメントに渡される', async () => {
    const user = userEvent.setup();
    const onOpenProfile = vi.fn();
    render(
      <CommentList
        comments={[comment({ userId: 7, displayName: '花子' })]}
        onDelete={vi.fn()}
        deletingCommentId={null}
        onOpenProfile={onOpenProfile}
      />,
    );

    await user.click(screen.getByRole('button', { name: '花子' }));

    expect(onOpenProfile).toHaveBeenCalledWith(7);
  });
});
