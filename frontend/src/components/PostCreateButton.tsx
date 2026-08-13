import { useState } from 'react';
import { Modal } from './Modal';
import { PostForm } from './PostForm';

interface PostCreateButtonProps {
  avatarUrl: string | null;
  onSubmit: (content: string, images: File[]) => Promise<boolean>;
  submitting: boolean;
  onOpenProfile: () => void;
}

/**
 * 「投稿を作成する」ボタンと、押したときに開く投稿作成モーダルをまとめたコンポーネント。
 * モーダルの開閉状態（`open`）はこのコンポーネント自身にローカルに持たせる。TimelineScreen
 * は画面（タイムライン一覧・検索・プロフィール等）を切り替えてもアンマウントされないため、
 * 開閉状態をTimelineScreen側に持たせると「モーダルを開いたまま他画面へ行って戻ってくる」
 * ケースで意図せず開いたままになってしまう。PostCreateButtonごと画面遷移でアンマウントされる
 * 位置（一覧・プロフィールそれぞれの中）に置くことで、開閉状態も自然にリセットされるようにする
 * （PostItem.tsxが編集・削除モーダルの開閉状態を自分自身に持たせているのと同じ考え方）。
 */
export function PostCreateButton({ avatarUrl, onSubmit, submitting, onOpenProfile }: PostCreateButtonProps) {
  const [open, setOpen] = useState(false);
  const closeModal = () => setOpen(false);

  // 投稿成功時だけモーダルを閉じる。失敗時は開いたままにして、入力内容を保持し再送信できるようにする
  const handleSubmit = async (content: string, images: File[]) => {
    const ok = await onSubmit(content, images);
    if (ok) closeModal();
    return ok;
  };

  return (
    <>
      <button type="button" className="btn post-create-button" onClick={() => setOpen(true)}>
        投稿を作成する
      </button>

      {open && (
        <Modal onClose={closeModal} ariaLabel="投稿を作成">
          <h2 className="modal-title">投稿を作成</h2>
          <PostForm avatarUrl={avatarUrl} onSubmit={handleSubmit} submitting={submitting} onOpenProfile={onOpenProfile} />
        </Modal>
      )}
    </>
  );
}
