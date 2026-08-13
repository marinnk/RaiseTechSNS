import { useState } from 'react';
import { Modal } from './Modal';
import { PostForm } from './PostForm';

interface PostCreateButtonProps {
  avatarUrl: string | null;
  onSubmit: (content: string, images: File[]) => Promise<boolean>;
  submitting: boolean;
  // 送信失敗時のエラーメッセージ。TimelineScreenの共通エラーバナーは.modal-overlayの下に
  // 隠れてしまうため、モーダルを開いている間はこちらで表示する
  error: string | null;
  onClearError: () => void;
  onOpenProfile: () => void;
}

/**
 * 「投稿を作成する」ボタンと、押したときに開く投稿作成モーダルをまとめたコンポーネント。
 * モーダルの開閉状態（`open`）はこのコンポーネント自身にローカルに持たせる。TimelineScreen
 * は画面（タイムライン一覧・検索・プロフィール等）を切り替えてもアンマウントされないため、
 * 開閉状態をTimelineScreen側に持たせると「モーダルを開いたまま他画面へ行って戻ってくる」
 * ケースで意図せず開いたままになってしまう。PostCreateButtonごと画面遷移で（このコンポーネント
 * 自体がJSXの分岐から外れることで）リセットされる位置（一覧・プロフィールそれぞれの中）に
 * 置くことで、開閉状態も自然にリセットされるようにする（PostItem.tsxが編集・削除モーダルの
 * 開閉状態を自分自身に持たせているのと同じ考え方）。
 *
 * ただし、送信中（`submitting`）はモーダルを閉じられないようにしている。閉じられてしまうと、
 * 「送信中にモーダルを閉じて再度開き、別の内容を入力する」→「先に送信していた分の結果が
 * 後から返ってきて、今開いている（別の内容が入力された）モーダルを閉じてしまう」という形で、
 * 後から入力した内容が無警告で失われる問題が起きるため
 */
export function PostCreateButton({ avatarUrl, onSubmit, submitting, error, onClearError, onOpenProfile }: PostCreateButtonProps) {
  const [open, setOpen] = useState(false);

  const openModal = () => setOpen(true);
  // 送信中はモーダルを閉じさせない（Escape・オーバーレイクリックからも呼ばれる）
  const closeModal = () => {
    if (submitting) return;
    onClearError();
    setOpen(false);
  };

  // 投稿成功時だけモーダルを閉じる。失敗時は開いたままにして、入力内容を保持し再送信できるようにする
  const handleSubmit = async (content: string, images: File[]) => {
    const ok = await onSubmit(content, images);
    if (ok) setOpen(false);
    return ok;
  };

  return (
    <>
      <button type="button" className="btn post-create-button" onClick={openModal}>
        投稿を作成する
      </button>

      {open && (
        <Modal onClose={closeModal} ariaLabel="投稿を作成">
          <h2 className="modal-title">投稿を作成</h2>
          {error && (
            <div className="form-error" role="alert">
              {error}
              <button type="button" className="link-button" onClick={onClearError}>
                閉じる
              </button>
            </div>
          )}
          <PostForm avatarUrl={avatarUrl} onSubmit={handleSubmit} submitting={submitting} onOpenProfile={onOpenProfile} />
        </Modal>
      )}
    </>
  );
}
