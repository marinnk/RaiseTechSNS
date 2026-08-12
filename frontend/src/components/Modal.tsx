import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

// ダイアログ内でTab移動の対象にするフォーカス可能要素
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 背景を暗くするオーバーレイ＋中央のダイアログ枠だけを提供する汎用コンポーネント。
 * 中身は呼び出し側が`children`で指定する。オーバーレイクリックとEscapeキーで閉じる。
 *
 * オーバーレイは（ダイアログの中にform要素を含められるよう）ダイアログとは別要素の
 * <button>にし、キーボード操作なしでクリックだけで閉じられる非対話要素にならないようにする。
 *
 * アクセシビリティのため、以下のフォーカス管理を行う。
 * - 開いたときにダイアログ内の最初のフォーカス可能要素へフォーカスを移す
 * - Tab/Shift+Tabでダイアログの外にフォーカスが出ないようにする（フォーカストラップ）
 * - 閉じたときに、開く前にフォーカスしていた要素へフォーカスを戻す
 */
export function Modal({ onClose, ariaLabel, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') trapFocus(e);
    }

    function trapFocus(e: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isInsideDialog = dialog.contains(document.activeElement);

      if (e.shiftKey) {
        if (!isInsideDialog || document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!isInsideDialog || document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const initialFocusTarget = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialog;
    initialFocusTarget?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <>
      <button type="button" className="modal-overlay" aria-label="モーダルを閉じる" onClick={onClose} />
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  );
}
