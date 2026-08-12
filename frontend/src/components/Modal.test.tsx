import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

/**
 * フォーカス復帰の検証用。トリガーボタンでモーダルの開閉を切り替える。
 */
function ToggleModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        開く
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} ariaLabel="テストモーダル">
          <button type="button" onClick={() => setOpen(false)}>
            閉じる
          </button>
        </Modal>
      )}
    </>
  );
}

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

  it('開いたときにダイアログ内の最初のフォーカス可能要素にフォーカスが移る', () => {
    render(
      <Modal onClose={() => {}} ariaLabel="テストモーダル">
        <button type="button">最初のボタン</button>
        <button type="button">次のボタン</button>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: '最初のボタン' })).toHaveFocus();
  });

  it('フォーカス可能な要素がない場合はダイアログ自体にフォーカスが移る', () => {
    render(
      <Modal onClose={() => {}} ariaLabel="テストモーダル">
        <p>モーダルの中身</p>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'テストモーダル' })).toHaveFocus();
  });

  it('Tabキーでダイアログ内の最後の要素から最初の要素にフォーカスが循環する', async () => {
    const user = userEvent.setup();
    render(
      <Modal onClose={() => {}} ariaLabel="テストモーダル">
        <button type="button">最初のボタン</button>
        <button type="button">次のボタン</button>
      </Modal>,
    );

    await user.tab(); // 最初のボタン → 次のボタン
    expect(screen.getByRole('button', { name: '次のボタン' })).toHaveFocus();

    await user.tab(); // 次のボタン（最後）→ 最初のボタンに循環する
    expect(screen.getByRole('button', { name: '最初のボタン' })).toHaveFocus();
  });

  it('Shift+Tabキーでダイアログ内の最初の要素から最後の要素にフォーカスが循環する', async () => {
    const user = userEvent.setup();
    render(
      <Modal onClose={() => {}} ariaLabel="テストモーダル">
        <button type="button">最初のボタン</button>
        <button type="button">次のボタン</button>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: '最初のボタン' })).toHaveFocus();

    await user.tab({ shift: true }); // 最初のボタン（先頭）→ 次のボタンに循環する
    expect(screen.getByRole('button', { name: '次のボタン' })).toHaveFocus();
  });

  it('閉じたときに、開く前にフォーカスしていた要素へフォーカスが戻る', async () => {
    const user = userEvent.setup();
    render(<ToggleModalHarness />);

    const openButton = screen.getByRole('button', { name: '開く' });
    openButton.focus();
    await user.click(openButton);

    expect(screen.getByRole('button', { name: '閉じる' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: '閉じる' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });
});
