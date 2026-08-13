import type { Comment } from '../types/comment';

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: number) => Promise<boolean>;
  deleting: boolean;
  onOpenProfile?: (userId: number) => void;
}

export function CommentItem({ comment, onDelete, deleting, onOpenProfile }: CommentItemProps) {
  const avatarIcon = comment.avatarUrl ? (
    <img src={comment.avatarUrl} alt="" className="avatar-icon-sm" />
  ) : (
    <span className="avatar-icon-sm avatar-icon-placeholder" aria-hidden="true" />
  );

  return (
    <article className="comment-item">
      <div className="comment-item-header">
        {onOpenProfile ? (
          <button type="button" className="link-button comment-author" onClick={() => onOpenProfile(comment.userId)}>
            {avatarIcon}
            {comment.displayName}
          </button>
        ) : (
          <span className="comment-author">
            {avatarIcon}
            {comment.displayName}
          </span>
        )}
        {comment.isOwnedByMe && (
          <button
            type="button"
            className="link-button"
            onClick={() => onDelete(comment.id)}
            disabled={deleting}
          >
            削除
          </button>
        )}
      </div>
      <p className="comment-content">{comment.content}</p>
    </article>
  );
}
