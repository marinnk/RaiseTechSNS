import type { Comment } from '../types/comment';
import { AvatarIcon } from './AvatarIcon';

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: number) => Promise<boolean>;
  deleting: boolean;
  onOpenProfile?: (userId: number) => void;
}

export function CommentItem({ comment, onDelete, deleting, onOpenProfile }: CommentItemProps) {
  return (
    <article className="comment-item">
      <div className="comment-item-header">
        {onOpenProfile ? (
          <button type="button" className="link-button comment-author" onClick={() => onOpenProfile(comment.userId)}>
            <AvatarIcon avatarUrl={comment.avatarUrl} />
            {comment.displayName}
          </button>
        ) : (
          <span className="comment-author">
            <AvatarIcon avatarUrl={comment.avatarUrl} />
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
