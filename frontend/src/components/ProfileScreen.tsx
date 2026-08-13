import type { FollowListType } from '../hooks/useFollowList';
import type { Post } from '../types/post';
import type { Profile } from '../types/profile';
import type { UserSummary } from '../types/follow';
import { FollowListPanel } from './FollowListPanel';
import { PostCreateButton } from './PostCreateButton';
import { PostList } from './PostList';

interface ProfileScreenProps {
  profile: Profile;
  onBack: () => void;
  onOpenEdit: () => void;
  onToggleFollow: (profile: Profile) => void;
  followSubmitting: boolean;
  openFollowPanel: FollowListType | null;
  followListUsers: UserSummary[];
  followListLoading: boolean;
  onToggleFollowPanel: (type: FollowListType) => void;
  posts: Post[];
  postsLoading: boolean;
  postsHasMore: boolean;
  postsLoadingMore: boolean;
  onLoadMorePosts: () => void;
  onSubmitPost: (content: string, images: File[]) => Promise<boolean>;
  postSubmitting: boolean;
  onEditPost: (postId: number, content: string, keepImageIds: number[], newImages: File[]) => Promise<boolean>;
  onDeletePost: (postId: number) => Promise<boolean>;
  onToggleLike: (post: Post) => void;
  isTogglingLike: (postId: number) => boolean;
  onOpenDetail: (postId: number) => void;
  onOpenProfile: (userId: number) => void;
}

// S05 プロフィール画面。アイコン・表示名・自己紹介・フォロー中/フォロワー数・
// （自分なら編集ボタン／他人ならフォローボタン）・その利用者の投稿一覧を表示する。
export function ProfileScreen({
  profile,
  onBack,
  onOpenEdit,
  onToggleFollow,
  followSubmitting,
  openFollowPanel,
  followListUsers,
  followListLoading,
  onToggleFollowPanel,
  posts,
  postsLoading,
  postsHasMore,
  postsLoadingMore,
  onLoadMorePosts,
  onSubmitPost,
  postSubmitting,
  onEditPost,
  onDeletePost,
  onToggleLike,
  isTogglingLike,
  onOpenDetail,
  onOpenProfile,
}: ProfileScreenProps) {
  return (
    <div className="profile-screen">
      <button type="button" className="link-button back-link" onClick={onBack}>
        ← タイムラインに戻る
      </button>

      <div className="profile-header">
        <div className="profile-header-main">
          <div className="profile-header-identity">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={`${profile.displayName}のアイコン`} className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar-placeholder" aria-hidden="true" />
            )}
            <div>
              <h1 className="profile-display-name">{profile.displayName}</h1>
              <p className="profile-username">@{profile.username}</p>
            </div>
          </div>
          {profile.isOwnedByMe ? (
            <button type="button" className="btn btn-outline" onClick={onOpenEdit}>
              プロフィールを編集
            </button>
          ) : (
            <button
              type="button"
              className={`btn${profile.followedByMe ? ' btn-outline' : ''}`}
              onClick={() => onToggleFollow(profile)}
              disabled={followSubmitting}
              aria-pressed={profile.followedByMe}
            >
              {profile.followedByMe ? 'フォロー中' : 'フォローする'}
            </button>
          )}
        </div>

        <p className="profile-bio">
          {profile.bio ? profile.bio : <span className="text-sub">自己紹介はまだ設定されていません。</span>}
        </p>

        <div className="follow-counts">
          <button type="button" className="link-button follow-count-button" onClick={() => onToggleFollowPanel('following')}>
            <strong>{profile.followingCount}</strong> フォロー中
          </button>
          <button type="button" className="link-button follow-count-button" onClick={() => onToggleFollowPanel('followers')}>
            <strong>{profile.followerCount}</strong> フォロワー
          </button>
        </div>

        {openFollowPanel && (
          <FollowListPanel
            type={openFollowPanel}
            users={followListUsers}
            loading={followListLoading}
            onSelectUser={onOpenProfile}
          />
        )}
      </div>

      {profile.isOwnedByMe && (
        <PostCreateButton
          avatarUrl={profile.avatarUrl}
          onSubmit={onSubmitPost}
          submitting={postSubmitting}
          onOpenProfile={() => onOpenProfile(profile.id)}
        />
      )}

      <h2 className="profile-posts-heading">{profile.displayName}の投稿</h2>
      {postsLoading ? (
        <p className="text-sub">読み込み中...</p>
      ) : (
        <PostList
          posts={posts}
          hasMore={postsHasMore}
          loadingMore={postsLoadingMore}
          onLoadMore={onLoadMorePosts}
          onEdit={onEditPost}
          onDelete={onDeletePost}
          onToggleLike={onToggleLike}
          isTogglingLike={isTogglingLike}
          onOpenDetail={onOpenDetail}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
}
