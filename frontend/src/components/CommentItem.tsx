import type { Comment } from '../types/comment';

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: number) => Promise<boolean>;
  deleting: boolean;
}

export function CommentItem({ comment, onDelete, deleting }: CommentItemProps) {
  return (
    <article className="comment-item">
      <div className="comment-item-header">
        <span className="comment-author">{comment.displayName}</span>
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
