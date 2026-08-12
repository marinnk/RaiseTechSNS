import { usePosts } from '../hooks/usePosts';
import { PostForm } from './PostForm';
import { PostList } from './PostList';

interface TimelineScreenProps {
  onLogout: () => void;
  logoutSubmitting: boolean;
}

// ログイン後のメイン画面（S03 タイムライン画面）。今回のスコープはテキストのみの投稿と
// 全体タイムライン（画像投稿・いいね・コメント・フォロー中タブ・検索・プロフィールは対象外）
export function TimelineScreen({ onLogout, logoutSubmitting }: TimelineScreenProps) {
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    loadMore,
    addPost,
    editPost,
    removePost,
    clearError,
  } = usePosts();

  return (
    <div className="timeline-page">
      <header className="timeline-header">
        <h1 className="timeline-logo">RaiseTechSNS</h1>
        <button type="button" className="link-button" onClick={onLogout} disabled={logoutSubmitting}>
          ログアウト
        </button>
      </header>

      {error && (
        <div className="form-error" role="alert">
          {error}
          <button type="button" className="link-button" onClick={clearError}>
            閉じる
          </button>
        </div>
      )}

      <PostForm onSubmit={addPost} submitting={submitting} />

      {loading ? (
        <p className="text-sub">読み込み中...</p>
      ) : (
        <PostList
          posts={posts}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          onEdit={editPost}
          onDelete={removePost}
        />
      )}
    </div>
  );
}
