import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('role=dialogで中身が表示される', () => {
    render(
      <Modal onClose={() => {}} ariaLabel="テストモーダル">
        <p>モーダルの中身</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'テストモーダル' })).toBeInTheDocument();
    expect(screen.getByText('モーダルの中身')).toBeInTheDocument();
  });

  it('オーバーレイをクリックするとonCloseが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="テストモーダル">
        <p>モーダルの中身</p>
      </Modal>,
    );

    // ダイアログの外側（オーバーレイ）をクリックする
    await user.click(screen.getByRole('button', { name: 'モーダルを閉じる' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('ダイアログ内をクリックしてもonCloseは呼ばれない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="テストモーダル">
        <p>モーダルの中身</p>
      </Modal>,
    );

    await user.click(screen.getByText('モーダルの中身'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escapeキーを押すとonCloseが呼ばれる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} ariaLabel="テストモーダル">
        <p>モーダルの中身</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
