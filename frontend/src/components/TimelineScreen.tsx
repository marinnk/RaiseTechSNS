import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { useLikes } from '../hooks/useLikes';
import { usePosts } from '../hooks/usePosts';
import { NewPostsBanner } from './NewPostsBanner';
import { PostDetailView } from './PostDetailView';
import { PostForm } from './PostForm';
import { PostList } from './PostList';

interface TimelineScreenProps {
  onLogout: () => void;
  logoutSubmitting: boolean;
}

// view状態でS03（タイムライン一覧）とS04（投稿詳細）を切り替える。react-router-dom等の
// ルーティングライブラリは導入せず、App.tsxのlogin/signup/timeline切り替えと同じ発想で
// このコンポーネント内のローカルなview stateだけで実現する。
type View = { mode: 'list' } | { mode: 'detail'; postId: number };

// ログイン後のメイン画面（S03 タイムライン画面 / S04 投稿詳細画面）。今回のスコープは
// テキストのみの投稿・全体タイムライン・いいね・コメント（画像投稿・フォロー中タブ・検索・
// プロフィールは対象外）
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
    applyLikeUpdate,
    bumpCommentCount,
  } = usePosts();

  const [view, setView] = useState<View>({ mode: 'list' });

  const { toggleLike, isToggling, error: likeError, clearError: clearLikeError } = useLikes(applyLikeUpdate);

  const activePostId = view.mode === 'detail' ? view.postId : null;
  const {
    comments,
    loading: commentsLoading,
    submitting: commentSubmitting,
    deletingId: deletingCommentId,
    error: commentsError,
    addComment,
    removeComment,
    clearError: clearCommentsError,
  } = useComments(activePostId, bumpCommentCount);

  // バナーをクリックしたら、貯めておいた新着投稿を一覧の先頭に反映してから最上部へスクロールする
  const handleShowNewPosts = () => {
    showNewPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetail = (postId: number) => setView({ mode: 'detail', postId });
  const backToList = () => setView({ mode: 'list' });

  // 詳細ビュー表示中に自分の投稿を削除したら、一覧へ自動的に戻す
  const handleDeleteInDetail = async (postId: number): Promise<boolean> => {
    const ok = await removePost(postId);
    if (ok) backToList();
    return ok;
  };

  const detailPost = view.mode === 'detail' ? posts.find((p) => p.id === view.postId) : undefined;
  const displayError = error ?? likeError ?? commentsError;
  const clearDisplayError = () => {
    clearError();
    clearLikeError();
    clearCommentsError();
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

      {displayError && (
        <div className="form-error" role="alert">
          {displayError}
          <button type="button" className="link-button" onClick={clearDisplayError}>
            閉じる
          </button>
        </div>
      )}

      {view.mode === 'list' ? (
        <>
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
              onToggleLike={toggleLike}
              isTogglingLike={isToggling}
              onOpenDetail={openDetail}
            />
          )}
        </>
      ) : detailPost ? (
        <PostDetailView
          post={detailPost}
          onBack={backToList}
          onEdit={editPost}
          onDelete={handleDeleteInDetail}
          onToggleLike={toggleLike}
          isTogglingLike={isToggling(detailPost.id)}
          comments={comments}
          commentsLoading={commentsLoading}
          commentSubmitting={commentSubmitting}
          deletingCommentId={deletingCommentId}
          onAddComment={addComment}
          onDeleteComment={removeComment}
        />
      ) : (
        // 他タブでの削除など、稀にposts配列から該当投稿が見つからなくなった場合の保険
        <p className="text-sub">投稿が見つかりませんでした。</p>
      )}
    </div>
  );
}
