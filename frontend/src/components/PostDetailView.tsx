import type { Comment } from '../types/comment';
import type { Post } from '../types/post';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { PostItem } from './PostItem';

interface PostDetailViewProps {
  post: Post;
  onBack: () => void;
  onEdit: (postId: number, content: string) => Promise<boolean>;
  onDelete: (postId: number) => Promise<boolean>;
  onToggleLike: (post: Post) => void;
  isTogglingLike: boolean;
  comments: Comment[];
  commentsLoading: boolean;
  commentSubmitting: boolean;
  deletingCommentId: number | null;
  onAddComment: (content: string) => Promise<boolean>;
  onDeleteComment: (commentId: number) => Promise<boolean>;
  // 投稿者名・コメント者名クリックでプロフィール画面（S05）へ遷移させたい場合に渡す
  onOpenProfile?: (userId: number) => void;
  // 戻る先の表示文言。タイムライン一覧から開いた場合は「タイムライン」、プロフィール画面の
  // 投稿一覧から開いた場合は「プロフィール」に戻る、と分かるようにする
  backLabel?: string;
  // コメント投稿フォームの横に表示する、ログイン中利用者自身のアイコン画像
  currentUserAvatarUrl: string | null;
}

// S04 投稿詳細画面。投稿本文・いいねボタンに加えて、コメント一覧・コメント投稿フォームを表示する。
export function PostDetailView({
  post,
  onBack,
  onEdit,
  onDelete,
  onToggleLike,
  isTogglingLike,
  comments,
  commentsLoading,
  commentSubmitting,
  deletingCommentId,
  onAddComment,
  onDeleteComment,
  onOpenProfile,
  backLabel = 'タイムライン',
  currentUserAvatarUrl,
}: PostDetailViewProps) {
  return (
    <div className="post-detail-view">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← {backLabel}に戻る
      </button>

      {/* onOpenDetailを渡さないことで、詳細ビュー自身の中ではコメントリンクを非活性表示にし、
          二重遷移（詳細から詳細へ）を避ける */}
      <PostItem
        post={post}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleLike={onToggleLike}
        isTogglingLike={isTogglingLike}
        onOpenProfile={onOpenProfile}
      />

      <section className="comments-section">
        <h2>コメント</h2>
        {commentsLoading ? (
          <p className="text-sub">読み込み中...</p>
        ) : (
          <CommentList
            comments={comments}
            onDelete={onDeleteComment}
            deletingCommentId={deletingCommentId}
            onOpenProfile={onOpenProfile}
          />
        )}
        <CommentForm avatarUrl={currentUserAvatarUrl} onSubmit={onAddComment} submitting={commentSubmitting} />
      </section>
    </div>
  );
}
