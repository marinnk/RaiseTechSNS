import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewPostsBanner } from './NewPostsBanner';

describe('NewPostsBanner', () => {
  it('件数を含むラベルのボタンを表示する', () => {
    render(<NewPostsBanner count={3} onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: '↑ 3件の新しい投稿があります' })).toBeInTheDocument();
  });

  it('クリックするとonClickが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<NewPostsBanner count={1} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: '↑ 1件の新しい投稿があります' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
