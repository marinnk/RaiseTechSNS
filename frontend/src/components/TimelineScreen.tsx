import { usePosts } from '../hooks/usePosts';
import { NewPostsBanner } from './NewPostsBanner';
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
    newPostsCount,
    loadMore,
    addPost,
    editPost,
    removePost,
    showNewPosts,
    clearError,
  } = usePosts();

  // バナーをクリックしたら、貯めておいた新着投稿を一覧の先頭に反映してから最上部へスクロールする
  const handleShowNewPosts = () => {
    showNewPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="timeline-page">
      {newPostsCount > 0 && <NewPostsBanner count={newPostsCount} onClick={handleShowNewPosts} />}

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
