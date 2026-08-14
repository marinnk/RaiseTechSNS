import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileScreen } from './ProfileScreen';
import { post } from '../testUtils/postFixture';
import type { Profile } from '../types/profile';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 2,
    username: 'jiro',
    displayName: '次郎',
    bio: null,
    avatarUrl: null,
    followerCount: 0,
    followingCount: 0,
    followedByMe: false,
    isOwnedByMe: false,
    ...overrides,
  };
}

function renderScreen(overrides: Partial<React.ComponentProps<typeof ProfileScreen>> = {}) {
  return render(
    <ProfileScreen
      profile={profile()}
      onBack={vi.fn()}
      onOpenEdit={vi.fn()}
      onToggleFollow={vi.fn()}
      followSubmitting={false}
      openFollowPanel={null}
      followListUsers={[]}
      followListLoading={false}
      onToggleFollowPanel={vi.fn()}
      posts={[]}
      postsLoading={false}
      postsHasMore={false}
      postsLoadingMore={false}
      onLoadMorePosts={vi.fn()}
      onSubmitPost={vi.fn().mockResolvedValue(true)}
      postSubmitting={false}
      postError={null}
      onClearPostError={vi.fn()}
      onEditPost={vi.fn().mockResolvedValue(true)}
      onDeletePost={vi.fn().mockResolvedValue(true)}
      onToggleLike={vi.fn()}
      isTogglingLike={() => false}
      onOpenDetail={vi.fn()}
      onOpenProfile={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ProfileScreen', () => {
  it('「← タイムラインに戻る」を押すとonBackが呼ばれる', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderScreen({ onBack });

    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('自分のプロフィールでは「プロフィールを編集」ボタンを表示し、フォローボタン・投稿作成ボタンを表示する', () => {
    renderScreen({ profile: profile({ isOwnedByMe: true }) });

    expect(screen.getByRole('button', { name: 'プロフィールを編集' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'フォローする' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'フォロー中' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿を作成する' })).toBeInTheDocument();
  });

  it('「プロフィールを編集」を押すとonOpenEditが呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenEdit = vi.fn();
    renderScreen({ profile: profile({ isOwnedByMe: true }), onOpenEdit });

    await user.click(screen.getByRole('button', { name: 'プロフィールを編集' }));

    expect(onOpenEdit).toHaveBeenCalled();
  });

  it('他人の未フォローのプロフィールでは「フォローする」を表示し、編集・投稿作成ボタンは表示しない', () => {
    renderScreen({ profile: profile({ isOwnedByMe: false, followedByMe: false }) });

    const followButton = screen.getByRole('button', { name: 'フォローする' });
    expect(followButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'プロフィールを編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '投稿を作成する' })).not.toBeInTheDocument();
  });

  it('他人のフォロー済みプロフィールでは「フォロー中」を表示する', () => {
    renderScreen({ profile: profile({ isOwnedByMe: false, followedByMe: true }) });

    expect(screen.getByRole('button', { name: 'フォロー中' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('フォローボタンを押すとonToggleFollowがprofileで呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggleFollow = vi.fn();
    const target = profile({ isOwnedByMe: false, followedByMe: false });
    renderScreen({ profile: target, onToggleFollow });

    await user.click(screen.getByRole('button', { name: 'フォローする' }));

    expect(onToggleFollow).toHaveBeenCalledWith(target);
  });

  it('followSubmitting=trueのときフォローボタンが無効になる', () => {
    renderScreen({ profile: profile({ isOwnedByMe: false }), followSubmitting: true });

    expect(screen.getByRole('button', { name: 'フォローする' })).toBeDisabled();
  });

  it('bioが設定されていればそのまま表示する', () => {
    renderScreen({ profile: profile({ bio: 'よろしくお願いします' }) });

    expect(screen.getByText('よろしくお願いします')).toBeInTheDocument();
  });

  it('bioが未設定（null）なら案内文を表示する', () => {
    renderScreen({ profile: profile({ bio: null }) });

    expect(screen.getByText('自己紹介はまだ設定されていません。')).toBeInTheDocument();
  });

  it('フォロー中の人数を押すとonToggleFollowPanelが"following"で呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggleFollowPanel = vi.fn();
    renderScreen({ profile: profile({ followingCount: 3 }), onToggleFollowPanel });

    await user.click(screen.getByRole('button', { name: '3 フォロー中' }));

    expect(onToggleFollowPanel).toHaveBeenCalledWith('following');
  });

  it('フォロワー数を押すとonToggleFollowPanelが"followers"で呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggleFollowPanel = vi.fn();
    renderScreen({ profile: profile({ followerCount: 5 }), onToggleFollowPanel });

    await user.click(screen.getByRole('button', { name: '5 フォロワー' }));

    expect(onToggleFollowPanel).toHaveBeenCalledWith('followers');
  });

  it('openFollowPanelがnullならフォロー一覧パネルは表示されない', () => {
    renderScreen({ openFollowPanel: null });

    expect(screen.queryByText('フォロワーがいません。')).not.toBeInTheDocument();
  });

  it('openFollowPanelが設定されていればフォロー一覧パネルが表示される', () => {
    renderScreen({
      openFollowPanel: 'followers',
      followListUsers: [{ id: 9, username: 'saburo', displayName: '三郎', avatarUrl: null, followedByMe: false }],
    });

    expect(screen.getByText('三郎')).toBeInTheDocument();
  });

  it('postsLoading=trueのときは読み込み中と表示し投稿一覧は表示しない', () => {
    renderScreen({ postsLoading: true, posts: [post({ content: '投稿本文' })] });

    expect(screen.getAllByText('読み込み中...').length).toBeGreaterThan(0);
    expect(screen.queryByText('投稿本文')).not.toBeInTheDocument();
  });

  it('postsLoading=falseなら投稿一覧を表示する', () => {
    renderScreen({ postsLoading: false, posts: [post({ content: '投稿本文' })] });

    expect(screen.getByText('投稿本文')).toBeInTheDocument();
  });

  it('avatarUrlがあればアイコン画像を表示する', () => {
    renderScreen({ profile: profile({ avatarUrl: 'https://example.com/jiro.jpg', displayName: '次郎' }) });

    expect(screen.getByAltText('次郎のアイコン')).toHaveAttribute('src', 'https://example.com/jiro.jpg');
  });

  it('avatarUrlがnullならプレースホルダーを表示する', () => {
    renderScreen({ profile: profile({ avatarUrl: null, displayName: '次郎' }) });

    expect(screen.queryByAltText('次郎のアイコン')).not.toBeInTheDocument();
    expect(document.querySelector('.profile-avatar-placeholder')).toBeInTheDocument();
  });
});
