import type { Comment } from '../types/comment';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  comments: Comment[];
  onDelete: (commentId: number) => Promise<boolean>;
  deletingCommentId: number | null;
  onOpenProfile?: (userId: number) => void;
}

export function CommentList({ comments, onDelete, deletingCommentId, onOpenProfile }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="comment-list-empty">まだコメントがありません。</p>;
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onDelete={onDelete}
          deleting={deletingCommentId === comment.id}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </div>
  );
}
