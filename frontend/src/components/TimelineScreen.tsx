import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { useFollow } from '../hooks/useFollow';
import { useFollowList } from '../hooks/useFollowList';
import { useLikes } from '../hooks/useLikes';
import { usePostStore } from '../hooks/usePostStore';
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
  // アバター画像の登録・削除が成功したとき、ヘッダー等で使うcurrentUser.avatarUrlにも
  // 反映するための更新口（呼び出し元のuseAuthが持つ）
  onCurrentUserAvatarChange: (avatarUrl: string | null) => void;
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
// S06 プロフィール編集画面）。プロフィール編集では自己紹介とアバター画像の両方を編集できる。
//
// 投稿の実データ（本文・いいね数・コメント数等）はusePostStoreが唯一の情報源として持つ。
// タイムライン一覧（usePosts）とプロフィールの投稿一覧（useUserPosts）は、同じ投稿
// （例：自分の投稿）を同時に表示することがあるため、それぞれ「どのidを表示するか」だけを
// 管理し、実データ・編集/削除/いいね/コメント数の更新はすべてpostStore側の関数に一本化する。
// これにより、投稿詳細ビューをタイムライン・プロフィールのどちらから開いても、同じ投稿を
// 表示している他の画面に操作結果が自動的に反映される。
export function TimelineScreen({
  currentUser,
  onLogout,
  logoutSubmitting,
  onCurrentUserAvatarChange,
}: TimelineScreenProps) {
  const [view, setView] = useState<View>({ mode: 'list' });
  const [scope, setScope] = useState<TimelineScope>('all');

  const postStore = usePostStore();

  const {
    postIds,
    loading,
    loadingMore,
    hasMore,
    error,
    submitting,
    newPostsCount,
    loadMore,
    addPost,
    showNewPosts,
    clearError,
  } = usePosts(scope, postStore.upsertPosts);
  const posts = postStore.getPosts(postIds);

  // いいねのトグルは唯一の投稿ストアを書き換えるだけなので、タイムライン・プロフィール・
  // 投稿詳細のどこで押しても1つのインスタンスで足りる
  const likes = useLikes(postStore.applyLikeUpdate);

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
    uploadAvatar,
    removeAvatar,
    savingAvatar,
    clearError: clearProfileError,
  } = useProfile(profileUserId, onCurrentUserAvatarChange);

  const {
    toggleFollow,
    submitting: followSubmitting,
    error: followError,
    clearError: clearFollowError,
  } = useFollow(applyProfileUpdate, profileUserId);

  const {
    openPanel: openFollowPanel,
    users: followListUsers,
    loading: followListLoading,
    error: followListError,
    togglePanel: onToggleFollowPanel,
  } = useFollowList(profileUserId);

  const {
    postIds: profilePostIds,
    loading: profilePostsLoading,
    loadingMore: profilePostsLoadingMore,
    hasMore: profilePostsHasMore,
    error: profilePostsError,
    loadMore: loadMoreProfilePosts,
    clearError: clearProfilePostsError,
  } = useUserPosts(profileUserId, postStore.upsertPosts);
  const profilePosts = postStore.getPosts(profilePostIds);

  // 投稿詳細ビュー（S04）はタイムライン一覧・プロフィールの投稿一覧のどちらから開いても、
  // 同じpostStoreから投稿データを引く（どちらから開いたかで参照先を分ける必要はない）
  const detailPost = view.mode === 'detail' ? postStore.getPosts([view.postId])[0] : undefined;
  const detailIsTogglingLike = detailPost ? likes.isToggling(detailPost.id) : false;

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
  } = useComments(activePostId, postStore.bumpCommentCount);

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

  // 詳細ビュー表示中に自分の投稿を削除したら、開いていた一覧（タイムライン or プロフィール）へ自動的に戻す。
  // 削除はpostStore側でidを取り除くだけなので、削除した投稿を表示していた他の画面（タイムライン・
  // プロフィールどちらでも）からも自動的に消える
  const handleDeleteInDetail = async (postId: number): Promise<boolean> => {
    const ok = await postStore.removePost(postId);
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
    postStore.error ??
    likes.error ??
    commentsError ??
    profileError ??
    followError ??
    followListError ??
    profilePostsError;
  const clearDisplayError = () => {
    clearError();
    postStore.clearError();
    likes.clearError();
    clearCommentsError();
    clearProfileError();
    clearFollowError();
    clearProfilePostsError();
  };

  return (
    <div className="timeline-page">
      {newPostsCount > 0 && <NewPostsBanner count={newPostsCount} onClick={handleShowNewPosts} />}

      <header className="timeline-header">
        <h1 className="timeline-logo">RaiseTechSNS</h1>
        <div className="timeline-header-actions">
          <button
            type="button"
            className="link-button timeline-header-user"
            onClick={() => openProfile(currentUser.id)}
          >
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="avatar-icon-sm" />
            ) : (
              <span className="avatar-icon-sm avatar-icon-placeholder" aria-hidden="true" />
            )}
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
          <PostForm avatarUrl={currentUser.avatarUrl} onSubmit={addPost} submitting={submitting} />

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
              onEdit={postStore.editPost}
              onDelete={postStore.removePost}
              onToggleLike={likes.toggleLike}
              isTogglingLike={likes.isToggling}
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
            onEditPost={postStore.editPost}
            onDeletePost={postStore.removePost}
            onToggleLike={likes.toggleLike}
            isTogglingLike={likes.isToggling}
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
            avatarUrl={profile.avatarUrl}
            submitting={savingBio}
            avatarSubmitting={savingAvatar}
            onCancel={backFromProfileEdit}
            onSave={handleSaveProfile}
            onUploadAvatar={uploadAvatar}
            onRemoveAvatar={removeAvatar}
          />
        ) : (
          <p className="text-sub">読み込み中...</p>
        )
      ) : detailPost ? (
        <PostDetailView
          post={detailPost}
          onBack={backFromDetail}
          backLabel={view.mode === 'detail' && view.returnTo.mode === 'profile' ? 'プロフィール' : 'タイムライン'}
          onEdit={postStore.editPost}
          onDelete={handleDeleteInDetail}
          onToggleLike={likes.toggleLike}
          isTogglingLike={detailIsTogglingLike}
          comments={comments}
          commentsLoading={commentsLoading}
          commentSubmitting={commentSubmitting}
          deletingCommentId={deletingCommentId}
          onAddComment={addComment}
          onDeleteComment={removeComment}
          onOpenProfile={openProfile}
          currentUserAvatarUrl={currentUser.avatarUrl}
        />
      ) : (
        // 他タブでの削除など、稀にpostStoreから該当投稿が見つからなくなった場合の保険
        <p className="text-sub">投稿が見つかりませんでした。</p>
      )}
    </div>
  );
}
