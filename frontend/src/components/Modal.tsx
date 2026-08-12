import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

/**
 * 背景を暗くするオーバーレイ＋中央のダイアログ枠だけを提供する汎用コンポーネント。
 * 中身は呼び出し側が`children`で指定する。オーバーレイクリックとEscapeキーで閉じる。
 *
 * オーバーレイは（ダイアログの中にform要素を含められるよう）ダイアログとは別要素の
 * <button>にし、キーボード操作なしでクリックだけで閉じられる非対話要素にならないようにする。
 */
export function Modal({ onClose, ariaLabel, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <button type="button" className="modal-overlay" aria-label="モーダルを閉じる" onClick={onClose} />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        {children}
      </div>
    </>
  );
}
