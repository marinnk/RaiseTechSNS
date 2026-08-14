import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentItem } from './CommentItem';
import { comment } from '../testUtils/commentFixture';

describe('CommentItem', () => {
  it('自分のコメントには削除ボタンが表示される', () => {
    render(<CommentItem comment={comment({ isOwnedByMe: true })} onDelete={vi.fn()} deleting={false} />);

    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('他人のコメントには削除ボタンが表示されない', () => {
    render(<CommentItem comment={comment({ isOwnedByMe: false })} onDelete={vi.fn()} deleting={false} />);

    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
  });

  it('削除ボタンを押すとonDeleteがコメントidで呼ばれる', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<CommentItem comment={comment({ id: 10, isOwnedByMe: true })} onDelete={onDelete} deleting={false} />);

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(onDelete).toHaveBeenCalledWith(10);
  });

  it('deleting=trueのとき削除ボタンが無効になる', () => {
    render(<CommentItem comment={comment({ isOwnedByMe: true })} onDelete={vi.fn()} deleting={true} />);

    expect(screen.getByRole('button', { name: '削除' })).toBeDisabled();
  });

  it('onOpenProfileを渡すと投稿者名がボタンになり、クリックでuserIdが渡される', async () => {
    const user = userEvent.setup();
    const onOpenProfile = vi.fn();
    render(
      <CommentItem
        comment={comment({ userId: 5, displayName: '次郎' })}
        onDelete={vi.fn()}
        deleting={false}
        onOpenProfile={onOpenProfile}
      />,
    );

    await user.click(screen.getByRole('button', { name: '次郎' }));

    expect(onOpenProfile).toHaveBeenCalledWith(5);
  });

  it('onOpenProfileを渡さないと投稿者名はボタンにならない', () => {
    render(<CommentItem comment={comment({ displayName: '次郎' })} onDelete={vi.fn()} deleting={false} />);

    expect(screen.queryByRole('button', { name: '次郎' })).not.toBeInTheDocument();
    expect(screen.getByText('次郎')).toBeInTheDocument();
  });

  it('コメント本文が表示される', () => {
    render(<CommentItem comment={comment({ content: '本文テキスト' })} onDelete={vi.fn()} deleting={false} />);

    expect(screen.getByText('本文テキスト')).toBeInTheDocument();
  });
});
