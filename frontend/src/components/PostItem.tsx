import { useState } from 'react';
import type { Post } from '../types/post';
import { formatDate } from '../utils/formatDate';
import { AvatarIcon } from './AvatarIcon';
import { Modal } from './Modal';
import { PostEditForm } from './PostEditForm';
import { PostImageGrid } from './PostImageGrid';

interface PostItemProps {
  post: Post;
  onEdit: (postId: number, content: string, keepImageIds: number[], newImages: File[]) => Promise<boolean>;
  onDelete: (postId: number) => Promise<boolean>;
  onToggleLike: (post: Post) => void;
  isTogglingLike: boolean;
  // 投稿詳細ビュー（S04）を開くリンクの表示要否・遷移先。渡さない場合はコメント件数を
  // ただのテキストにする（詳細ビュー自身の中でPostItemを再利用する際、二重遷移を避けるため）
  onOpenDetail?: (postId: number) => void;
  // 投稿者名クリックでプロフィール画面（S05）へ遷移させたい場合に渡す
  onOpenProfile?: (userId: number) => void;
}

type ModalMode = 'none' | 'edit' | 'delete';

export function PostItem({
  post,
  onEdit,
  onDelete,
  onToggleLike,
  isTogglingLike,
  onOpenDetail,
  onOpenProfile,
}: PostItemProps) {
  const [modalMode, setModalMode] = useState<ModalMode>('none');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const closeModal = () => setModalMode('none');

  const handleSave = async (content: string, keepImageIds: number[], newImages: File[]) => {
    setEditSubmitting(true);
    const ok = await onEdit(post.id, content, keepImageIds, newImages);
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
        {onOpenProfile ? (
          <button type="button" className="link-button post-author" onClick={() => onOpenProfile(post.userId)}>
            <AvatarIcon avatarUrl={post.avatarUrl} />
            {post.displayName}
          </button>
        ) : (
          <span className="post-author">
            <AvatarIcon avatarUrl={post.avatarUrl} />
            {post.displayName}
          </span>
        )}
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
      <PostImageGrid images={post.images} />

      <div className="post-stats">
        <button
          type="button"
          className={`like-button${post.likedByMe ? ' liked' : ''}`}
          onClick={() => onToggleLike(post)}
          disabled={isTogglingLike}
          aria-pressed={post.likedByMe}
        >
          <span aria-hidden="true">{post.likedByMe ? '♥' : '♡'}</span> いいね {post.likeCount}
        </button>
        {onOpenDetail ? (
          <button type="button" className="link-button comment-link" onClick={() => onOpenDetail(post.id)}>
            <span aria-hidden="true">💬</span> コメント {post.commentCount}
          </button>
        ) : (
          <span className="comment-count-label">
            <span aria-hidden="true">💬</span> コメント {post.commentCount}
          </span>
        )}
      </div>

      {modalMode === 'edit' && (
        <Modal onClose={closeModal} ariaLabel="投稿を編集">
          <PostEditForm
            initialContent={post.content}
            initialImages={post.images}
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
