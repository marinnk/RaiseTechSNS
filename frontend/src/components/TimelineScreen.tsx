import { useCallback, useState } from 'react';
import { useComments } from '../hooks/useComments';
import { useFollow } from '../hooks/useFollow';
import { useFollowList } from '../hooks/useFollowList';
import { useLikes } from '../hooks/useLikes';
import { usePosts } from '../hooks/usePosts';
import { useProfile } from '../hooks/useProfile';
import { useUserPosts } from '../hooks/useUserPosts';
import type { AuthUser } from '../types/auth';
import { NewPostsBanner } from './NewPostsBanner';
import { PostDetailView } from './PostDetailView';
import { PostForm } from './PostForm';
import { PostList } from './PostList';
import { ProfileEditForm } from './ProfileEditForm';
import { ProfileScreen } from './ProfileScreen';

interface TimelineScreenProps {
  currentUser: AuthUser;
  onLogout: () => void;
  logoutSubmitting: boolean;
}

// 詳細ビューを閉じたときにどこへ戻るか。タイムライン一覧から開いた場合と、プロフィール画面の
// 投稿一覧から開いた場合とで戻り先が異なる
type ReturnView = { mode: 'list' } | { mode: 'profile'; userId: number };

// view状態でS03（タイムライン一覧）・S04（投稿詳細）・S05（プロフィール）・S06（プロフィール編集）を
// 切り替える。react-router-dom等のルーティングライブラリは導入せず、App.tsxのlogin/signup/timeline
// 切り替えと同じ発想で、このコンポーネント内のローカルなview stateだけで実現する。
type View =
  | { mode: 'list' }
  | { mode: 'detail'; postId: number; returnTo: ReturnView }
  | { mode: 'profile'; userId: number }
  | { mode: 'profileEdit' };

type TimelineScope = 'all' | 'following';

// ログイン後のメイン画面（S03 タイムライン画面 / S04 投稿詳細画面 / S05 プロフィール画面 /
// S06 プロフィール編集画面）。プロフィール編集は今バージョンでは自己紹介のみ対象
// （アイコン画像のアップロードは別Issueで対応）。
export function TimelineScreen({ currentUser, onLogout, logoutSubmitting }: TimelineScreenProps) {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [scope, setScope] = useState<TimelineScope>('all');

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
  } = usePosts(scope);

  const mainLikes = useLikes(applyLikeUpdate);

  // プロフィール画面で表示する利用者のid。プロフィール編集中は自分自身、投稿詳細ビューが
  // プロフィール経由で開かれている間もプロフィール側のデータ（投稿一覧・フォロー状態）を
  // 保持しておく必要があるため、それらのモードでもここに含める
  const profileUserId =
    view.mode === 'profile'
      ? view.userId
      : view.mode === 'profileEdit'
        ? currentUser.id
        : view.mode === 'detail' && view.returnTo.mode === 'profile'
          ? view.returnTo.userId
          : null;

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    applyProfileUpdate,
    saveBio,
    savingBio,
    clearError: clearProfileError,
  } = useProfile(profileUserId);

  const {
    toggleFollow,
    submitting: followSubmitting,
    error: followError,
    clearError: clearFollowError,
  } = useFollow(applyProfileUpdate);

  const {
    openPanel: openFollowPanel,
    users: followListUsers,
    loading: followListLoading,
    error: followListError,
    togglePanel: onToggleFollowPanel,
  } = useFollowList(profileUserId);

  const {
    posts: profilePosts,
    loading: profilePostsLoading,
    loadingMore: profilePostsLoadingMore,
    hasMore: profilePostsHasMore,
    error: profilePostsError,
    loadMore: loadMoreProfilePosts,
    editPost: editProfilePost,
    removePost: removeProfilePost,
    clearError: clearProfilePostsError,
    applyLikeUpdate: applyProfileLikeUpdate,
    bumpCommentCount: bumpProfileCommentCount,
  } = useUserPosts(profileUserId);

  const profileLikes = useLikes(applyProfileLikeUpdate);

  // 投稿詳細ビュー（S04）は、タイムライン一覧・プロフィールの投稿一覧のどちらから開かれたかで
  // 参照すべき配列（posts / profilePosts）が異なる。returnToにその情報を持たせているので、
  // ここから毎回どちらの配列・フックを使うべきかを決める
  const detailSource: 'timeline' | 'profile' | null =
    view.mode === 'detail' ? (view.returnTo.mode === 'profile' ? 'profile' : 'timeline') : null;
  const detailPost =
    view.mode === 'detail'
      ? (detailSource === 'profile' ? profilePosts : posts).find((p) => p.id === view.postId)
      : undefined;
  const detailEditPost = detailSource === 'profile' ? editProfilePost : editPost;
  const detailToggleLike = detailSource === 'profile' ? profileLikes.toggleLike : mainLikes.toggleLike;
  const detailIsTogglingLike = detailPost
    ? detailSource === 'profile'
      ? profileLikes.isToggling(detailPost.id)
      : mainLikes.isToggling(detailPost.id)
    : false;

  const activePostId = view.mode === 'detail' ? view.postId : null;
  const handleCommentCountChange = useCallback(
    (postId: number, delta: number) => {
      if (detailSource === 'profile') bumpProfileCommentCount(postId, delta);
      else bumpCommentCount(postId, delta);
    },
    [detailSource, bumpProfileCommentCount, bumpCommentCount],
  );
  const {
    comments,
    loading: commentsLoading,
    submitting: commentSubmitting,
    deletingId: deletingCommentId,
    error: commentsError,
    addComment,
    removeComment,
    clearError: clearCommentsError,
  } = useComments(activePostId, handleCommentCountChange);

  // バナーをクリックしたら、貯めておいた新着投稿を一覧の先頭に反映してから最上部へスクロールする
  const handleShowNewPosts = () => {
    showNewPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetail = (postId: number) => setView({ mode: 'detail', postId, returnTo: { mode: 'list' } });
  const openDetailFromProfile = (postId: number) => {
    if (view.mode !== 'profile') return;
    setView({ mode: 'detail', postId, returnTo: { mode: 'profile', userId: view.userId } });
  };
  const backToList = () => setView({ mode: 'list' });
  const backFromDetail = () => {
    if (view.mode === 'detail') setView(view.returnTo);
  };
  const openProfile = (userId: number) => setView({ mode: 'profile', userId });
  const openProfileEdit = () => setView({ mode: 'profileEdit' });
  const backFromProfileEdit = () => setView({ mode: 'profile', userId: currentUser.id });

  // 詳細ビュー表示中に自分の投稿を削除したら、開いていた一覧（タイムライン or プロフィール）へ自動的に戻す
  const handleDeleteInDetail = async (postId: number): Promise<boolean> => {
    const remove = detailSource === 'profile' ? removeProfilePost : removePost;
    const ok = await remove(postId);
    if (ok) backFromDetail();
    return ok;
  };

  const handleSaveProfile = async (bio: string): Promise<boolean> => {
    const ok = await saveBio(bio);
    if (ok) backFromProfileEdit();
    return ok;
  };

  const displayError =
    error ??
    mainLikes.error ??
    commentsError ??
    profileError ??
    followError ??
    followListError ??
    profilePostsError ??
    profileLikes.error;
  const clearDisplayError = () => {
    clearError();
    mainLikes.clearError();
    clearCommentsError();
    clearProfileError();
    clearFollowError();
    clearProfilePostsError();
    profileLikes.clearError();
  };

  return (
    <div className="timeline-page">
      {newPostsCount > 0 && <NewPostsBanner count={newPostsCount} onClick={handleShowNewPosts} />}

      <header className="timeline-header">
        <h1 className="timeline-logo">RaiseTechSNS</h1>
        <div className="timeline-header-actions">
          <button type="button" className="link-button" onClick={() => openProfile(currentUser.id)}>
            {currentUser.displayName}
          </button>
          <button type="button" className="link-button" onClick={onLogout} disabled={logoutSubmitting}>
            ログアウト
          </button>
        </div>
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

          <div className="timeline-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'all'}
              className={`timeline-tab${scope === 'all' ? ' active' : ''}`}
              onClick={() => setScope('all')}
            >
              全体
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'following'}
              className={`timeline-tab${scope === 'following' ? ' active' : ''}`}
              onClick={() => setScope('following')}
            >
              フォロー中
            </button>
          </div>

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
              onToggleLike={mainLikes.toggleLike}
              isTogglingLike={mainLikes.isToggling}
              onOpenDetail={openDetail}
              onOpenProfile={openProfile}
            />
          )}
        </>
      ) : view.mode === 'profile' ? (
        profile ? (
          <ProfileScreen
            profile={profile}
            onBack={backToList}
            onOpenEdit={openProfileEdit}
            onToggleFollow={toggleFollow}
            followSubmitting={followSubmitting}
            openFollowPanel={openFollowPanel}
            followListUsers={followListUsers}
            followListLoading={followListLoading}
            onToggleFollowPanel={onToggleFollowPanel}
            posts={profilePosts}
            postsLoading={profilePostsLoading}
            postsHasMore={profilePostsHasMore}
            postsLoadingMore={profilePostsLoadingMore}
            onLoadMorePosts={loadMoreProfilePosts}
            onEditPost={editProfilePost}
            onDeletePost={removeProfilePost}
            onToggleLike={profileLikes.toggleLike}
            isTogglingLike={profileLikes.isToggling}
            onOpenDetail={openDetailFromProfile}
            onOpenProfile={openProfile}
          />
        ) : (
          <p className="text-sub">{profileLoading ? '読み込み中...' : '利用者が見つかりませんでした。'}</p>
        )
      ) : view.mode === 'profileEdit' ? (
        profile ? (
          <ProfileEditForm
            initialBio={profile.bio ?? ''}
            submitting={savingBio}
            onCancel={backFromProfileEdit}
            onSave={handleSaveProfile}
          />
        ) : (
          <p className="text-sub">読み込み中...</p>
        )
      ) : detailPost ? (
        <PostDetailView
          post={detailPost}
          onBack={backFromDetail}
          backLabel={detailSource === 'profile' ? 'プロフィール' : 'タイムライン'}
          onEdit={detailEditPost}
          onDelete={handleDeleteInDetail}
          onToggleLike={detailToggleLike}
          isTogglingLike={detailIsTogglingLike}
          comments={comments}
          commentsLoading={commentsLoading}
          commentSubmitting={commentSubmitting}
          deletingCommentId={deletingCommentId}
          onAddComment={addComment}
          onDeleteComment={removeComment}
          onOpenProfile={openProfile}
        />
      ) : (
        // 他タブでの削除など、稀にposts配列から該当投稿が見つからなくなった場合の保険
        <p className="text-sub">投稿が見つかりませんでした。</p>
      )}
    </div>
  );
}
