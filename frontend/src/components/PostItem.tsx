import { useState } from 'react';
import type { Post } from '../types/post';
import { formatDate } from '../utils/formatDate';
import { Modal } from './Modal';
import { PostEditForm } from './PostEditForm';

interface PostItemProps {
  post: Post;
  onEdit: (postId: number, content: string) => Promise<boolean>;
  onDelete: (postId: number) => Promise<boolean>;
}

type ModalMode = 'none' | 'edit' | 'delete';

export function PostItem({ post, onEdit, onDelete }: PostItemProps) {
  const [modalMode, setModalMode] = useState<ModalMode>('none');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const closeModal = () => setModalMode('none');

  const handleSave = async (content: string) => {
    setEditSubmitting(true);
    const ok = await onEdit(post.id, content);
    setEditSubmitting(false);
    if (ok) closeModal();
  };

  const handleConfirmDelete = async () => {
    setDeleteSubmitting(true);
    const ok = await onDelete(post.id);
    setDeleteSubmitting(false);
    if (ok) closeModal();
  };

  return (
    <article className="post-item">
      <div className="post-item-header">
        <span className="post-author">{post.displayName}</span>
        <time className="post-date" dateTime={post.createdAt}>
          {formatDate(post.createdAt)}
        </time>
        {post.isOwnedByMe && (
          <span className="post-actions">
            <button type="button" className="link-button" onClick={() => setModalMode('edit')}>
              編集
            </button>
            <button type="button" className="link-button" onClick={() => setModalMode('delete')}>
              削除
            </button>
          </span>
        )}
      </div>
      <p className="post-content">{post.content}</p>

      {modalMode === 'edit' && (
        <Modal onClose={closeModal} ariaLabel="投稿を編集">
          <PostEditForm
            initialContent={post.content}
            submitting={editSubmitting}
            onCancel={closeModal}
            onSave={handleSave}
          />
        </Modal>
      )}

      {modalMode === 'delete' && (
        <Modal onClose={closeModal} ariaLabel="投稿を削除">
          <div className="delete-confirm">
            <p>この投稿を削除しますか？</p>
            <div className="post-form-footer">
              <button type="button" className="link-button" onClick={closeModal} disabled={deleteSubmitting}>
                キャンセル
              </button>
              <button type="button" className="btn" onClick={handleConfirmDelete} disabled={deleteSubmitting}>
                削除
              </button>
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}
