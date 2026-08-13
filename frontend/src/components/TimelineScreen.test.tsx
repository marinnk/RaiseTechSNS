import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineScreen } from './TimelineScreen';
import { mockFetch } from '../testUtils/mockFetch';
import { installIntersectionObserverMock, MockIntersectionObserver } from '../testUtils/mockIntersectionObserver';
import type { AuthUser } from '../types/auth';
import type { Comment } from '../types/comment';
import type { Post } from '../types/post';
import type { Profile } from '../types/profile';

const currentUser: AuthUser = {
  id: 1,
  username: 'taro',
  displayName: '太郎',
  email: 'taro@example.com',
  avatarUrl: null,
};

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    userId: 1,
    username: 'taro',
    displayName: '太郎',
    avatarUrl: null,
    content: '投稿本文',
    createdAt: '2026-08-10T10:00:00',
    updatedAt: '2026-08-10T10:00:00',
    isOwnedByMe: true,
    likeCount: 0,
    commentCount: 0,
    likedByMe: false,
    ...overrides,
  };
}

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

function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 1,
    postId: 1,
    userId: 2,
    username: 'jiro',
    displayName: '次郎',
    avatarUrl: null,
    content: 'コメント本文',
    isOwnedByMe: false,
    ...overrides,
  };
}

describe('TimelineScreen', () => {
  beforeEach(() => {
    installIntersectionObserverMock();
  });

  it('投稿一覧が表示される', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '一件目の投稿' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );

    expect(await screen.findByText('一件目の投稿')).toBeInTheDocument();
  });

  it('投稿がまだ無い場合は空メッセージが表示される', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );

    expect(await screen.findByText('まだ投稿がありません。')).toBeInTheDocument();
  });

  it('投稿フォームからの新規作成が一覧先頭に反映される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'POST /api/posts': () => ({ status: 201, body: post({ id: 1, content: 'はじめての投稿' }) }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');

    await user.type(screen.getByLabelText('投稿内容'), 'はじめての投稿');
    await user.click(screen.getByRole('button', { name: '投稿' }));

    expect(await screen.findByText('はじめての投稿')).toBeInTheDocument();
    expect(screen.queryByText('まだ投稿がありません。')).not.toBeInTheDocument();
  });

  it('投稿内容のテキストエリアには280文字のmaxLengthが設定されており、未入力時は投稿ボタンが無効になる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    const textarea = await screen.findByLabelText('投稿内容');
    const submitButton = screen.getByRole('button', { name: '投稿' });

    expect(textarea).toHaveAttribute('maxlength', '280');
    expect(submitButton).toBeDisabled();

    await user.type(textarea, 'こんにちは');
    expect(submitButton).not.toBeDisabled();
  });

  it('自分の投稿にのみ編集・削除ボタンが表示される', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: {
            posts: [
              post({ id: 1, content: '自分の投稿', isOwnedByMe: true }),
              post({ id: 2, content: '他人の投稿', isOwnedByMe: false }),
            ],
            hasMore: false,
          },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('自分の投稿');

    expect(screen.getAllByRole('button', { name: '編集' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(1);
  });

  it('「編集」でモーダルが開き保存すると一覧に反映されモーダルが閉じる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '編集前' })], hasMore: false },
        }),
        'PUT /api/posts/1': () => ({ status: 200, body: post({ id: 1, content: '編集後' }) }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('編集前');

    await user.click(screen.getByRole('button', { name: '編集' }));
    const dialog = await screen.findByRole('dialog', { name: '投稿を編集' });
    const textarea = within(dialog).getByLabelText('投稿内容');
    await user.clear(textarea);
    await user.type(textarea, '編集後');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(await screen.findByText('編集後')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('「削除」でモーダルが開き確認すると一覧から消えモーダルが閉じる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '削除される投稿' })], hasMore: false },
        }),
        'DELETE /api/posts/1': () => ({ status: 204 }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('削除される投稿');

    await user.click(screen.getByRole('button', { name: '削除' }));
    const dialog = await screen.findByRole('dialog', { name: '投稿を削除' });
    expect(within(dialog).getByText('この投稿を削除しますか？')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '削除' }));

    expect(await screen.findByText('まだ投稿がありません。')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('編集モーダルの「キャンセル」で変更を破棄してモーダルが閉じる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '編集前' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('編集前');

    await user.click(screen.getByRole('button', { name: '編集' }));
    const dialog = await screen.findByRole('dialog', { name: '投稿を編集' });
    const textarea = within(dialog).getByLabelText('投稿内容');
    await user.clear(textarea);
    await user.type(textarea, '編集したが破棄する');
    await user.click(within(dialog).getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('編集前')).toBeInTheDocument();
    expect(screen.queryByText('編集したが破棄する')).not.toBeInTheDocument();
  });

  it('末尾のsentinelが可視化されるとbeforeId付きで古い投稿が追加取得される', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 5, content: '新しい投稿' })], hasMore: true },
        }),
        'GET /api/posts?limit=20&beforeId=5': () => ({
          status: 200,
          body: { posts: [post({ id: 4, content: '古い投稿' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('新しい投稿');

    const observer = MockIntersectionObserver.instances.at(-1);
    await act(async () => {
      observer?.trigger(true);
    });

    expect(await screen.findByText('古い投稿')).toBeInTheDocument();
  });

  it('hasMoreがfalseならsentinelを監視しない', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '唯一の投稿' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('唯一の投稿');

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('ポーリング間隔（30秒）経過後に新着通知バナーが件数付きで表示され、投稿はまだ一覧に反映されない', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '元の投稿' })], hasMore: false },
        }),
        'GET /api/posts?limit=20&afterId=1': () => ({
          status: 200,
          body: { posts: [post({ id: 2, content: '新着投稿' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('元の投稿')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新しい投稿があります/ })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(screen.getByRole('button', { name: '↑ 1件の新しい投稿があります' })).toBeInTheDocument();
    expect(screen.queryByText('新着投稿')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('新着通知バナーをクリックすると新着投稿が一覧の先頭に反映され、最上部までスクロールする', async () => {
    vi.useFakeTimers();
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '元の投稿' })], hasMore: false },
        }),
        'GET /api/posts?limit=20&afterId=1': () => ({
          status: 200,
          body: { posts: [post({ id: 2, content: '新着投稿' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    const banner = screen.getByRole('button', { name: /新しい投稿があります/ });

    fireEvent.click(banner);

    expect(screen.getByText('新着投稿')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新しい投稿があります/ })).not.toBeInTheDocument();
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    scrollToSpy.mockRestore();
    vi.useRealTimers();
  });

  it('複数回のポーリングで新着件数が積み上がる', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '元の投稿' })], hasMore: false },
        }),
        'GET /api/posts?limit=20&afterId=1': () => ({
          status: 200,
          body: { posts: [post({ id: 2, content: '2件目の新着' })], hasMore: false },
        }),
        'GET /api/posts?limit=20&afterId=2': () => ({
          status: 200,
          body: { posts: [post({ id: 3, content: '3件目の新着' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(screen.getByRole('button', { name: '↑ 1件の新しい投稿があります' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(screen.getByRole('button', { name: '↑ 2件の新しい投稿があります' })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('いいねボタンを押すとlikeCountが即座に増えlikedByMeが反映される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿', likeCount: 0, likedByMe: false })], hasMore: false },
        }),
        'POST /api/posts/1/likes': () => ({ status: 200, body: { likeCount: 1, likedByMe: true } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿');

    const likeButton = screen.getByRole('button', { name: 'いいね 0' });
    await user.click(likeButton);

    expect(await screen.findByRole('button', { name: 'いいね 1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('いいね済みの投稿でいいねを取り消すとlikeCountが減る', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿', likeCount: 1, likedByMe: true })], hasMore: false },
        }),
        'DELETE /api/posts/1/likes': () => ({ status: 200, body: { likeCount: 0, likedByMe: false } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿');

    await user.click(screen.getByRole('button', { name: 'いいね 1' }));

    expect(await screen.findByRole('button', { name: 'いいね 0' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('いいねAPIが失敗すると表示がロールバックされる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿', likeCount: 0, likedByMe: false })], hasMore: false },
        }),
        'POST /api/posts/1/likes': () => ({ status: 500 }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿');

    await user.click(screen.getByRole('button', { name: 'いいね 0' }));
    // 楽観的更新で一瞬「いいね 1」になった後、失敗を検知してロールバックされる
    expect(await screen.findByRole('button', { name: 'いいね 0' })).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('コメントリンクをクリックすると投稿詳細ビューに遷移し「戻る」で一覧に戻る', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿本文', commentCount: 0 })], hasMore: false },
        }),
        'GET /api/posts/1/comments': () => ({ status: 200, body: { comments: [] } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿本文');

    await user.click(screen.getByRole('button', { name: 'コメント 0' }));

    expect(await screen.findByText('まだコメントがありません。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← タイムラインに戻る' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));

    expect(screen.queryByText('まだコメントがありません。')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'コメント 0' })).toBeInTheDocument();
  });

  it('投稿詳細ビューでコメント一覧が表示される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿本文' })], hasMore: false },
        }),
        'GET /api/posts/1/comments': () => ({
          status: 200,
          body: { comments: [comment({ id: 10, content: '既存のコメント' })] },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿本文');
    await user.click(screen.getByRole('button', { name: 'コメント 0' }));

    expect(await screen.findByText('既存のコメント')).toBeInTheDocument();
  });

  it('投稿詳細ビューでコメントを投稿すると一覧に追加されcommentCountが増える', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿本文', commentCount: 0 })], hasMore: false },
        }),
        'GET /api/posts/1/comments': () => ({ status: 200, body: { comments: [] } }),
        'POST /api/posts/1/comments': () => ({
          status: 201,
          body: comment({ id: 20, content: '新しいコメント', isOwnedByMe: true }),
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿本文');
    await user.click(screen.getByRole('button', { name: 'コメント 0' }));
    await screen.findByText('まだコメントがありません。');

    await user.type(screen.getByLabelText('コメント内容'), '新しいコメント');
    await user.click(screen.getByRole('button', { name: 'コメントする' }));

    expect(await screen.findByText('新しいコメント')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));
    expect(screen.getByRole('button', { name: 'コメント 1' })).toBeInTheDocument();
  });

  it('投稿詳細ビューで自分のコメントを削除するとcommentCountが減り、他人のコメントには削除ボタンが表示されない', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '投稿本文', commentCount: 2 })], hasMore: false },
        }),
        'GET /api/posts/1/comments': () => ({
          status: 200,
          body: {
            comments: [
              comment({ id: 10, content: '自分のコメント', isOwnedByMe: true }),
              comment({ id: 11, content: '他人のコメント', isOwnedByMe: false }),
            ],
          },
        }),
        'DELETE /api/comments/10': () => ({ status: 204 }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('投稿本文');
    await user.click(screen.getByRole('button', { name: 'コメント 2' }));
    await screen.findByText('自分のコメント');

    // 投稿自体にも「削除」ボタンがあるため、コメント一覧のスコープに絞って確認する
    const commentList = document.querySelector<HTMLElement>('.comment-list');
    if (!commentList) throw new Error('comment-list not found');
    expect(within(commentList).getAllByRole('button', { name: '削除' })).toHaveLength(1);

    await user.click(within(commentList).getByRole('button', { name: '削除' }));

    expect(screen.queryByText('自分のコメント')).not.toBeInTheDocument();
    expect(screen.getByText('他人のコメント')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));
    expect(screen.getByRole('button', { name: 'コメント 1' })).toBeInTheDocument();
  });

  it('投稿詳細ビューで自分の投稿を削除すると一覧ビューに自動的に戻る', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '削除される投稿' })], hasMore: false },
        }),
        'GET /api/posts/1/comments': () => ({ status: 200, body: { comments: [] } }),
        'DELETE /api/posts/1': () => ({ status: 204 }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('削除される投稿');
    await user.click(screen.getByRole('button', { name: 'コメント 0' }));
    await screen.findByRole('button', { name: '← タイムラインに戻る' });

    await user.click(screen.getByRole('button', { name: '削除' }));
    const dialog = await screen.findByRole('dialog', { name: '投稿を削除' });
    await user.click(within(dialog).getByRole('button', { name: '削除' }));

    expect(await screen.findByText('まだ投稿がありません。')).toBeInTheDocument();
  });

  it('投稿者名をクリックするとプロフィール画面に遷移する', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: {
            posts: [
              post({
                id: 1,
                userId: 2,
                username: 'jiro',
                displayName: '次郎',
                avatarUrl: 'https://example.com/avatars/jiro.jpg',
                isOwnedByMe: false,
              }),
            ],
            hasMore: false,
          },
        }),
        'GET /api/users/2': () => ({ status: 200, body: profile({ id: 2 }) }),
        'GET /api/posts?limit=20&userId=2': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('次郎');

    // アイコンも投稿者名と同じボタンの中にあり、クリックでプロフィールへ遷移できる
    const authorButton = screen.getByRole('button', { name: '次郎' });
    expect(authorButton.querySelector('img')).toHaveAttribute('src', 'https://example.com/avatars/jiro.jpg');
    await user.click(authorButton);

    expect(await screen.findByText('@jiro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'フォローする' })).toBeInTheDocument();
    expect(screen.getByText('自己紹介はまだ設定されていません。')).toBeInTheDocument();
  });

  it('ヘッダーの自分の表示名をクリックすると自分のプロフィールに遷移し、編集ボタンが表示される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users/1': () => ({
          status: 200,
          body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true }),
        }),
        'GET /api/posts?limit=20&userId=1': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');

    await user.click(screen.getByRole('button', { name: '太郎' }));

    expect(await screen.findByText('@taro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'プロフィールを編集' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'フォローする' })).not.toBeInTheDocument();
  });

  it('ヘッダーの「検索」からユーザーを検索し、結果からプロフィールに遷移できる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users?q=jiro': () => ({
          status: 200,
          body: { users: [{ id: 2, username: 'jiro', displayName: '次郎', avatarUrl: null, followedByMe: false }] },
        }),
        'GET /api/users/2': () => ({ status: 200, body: profile({ id: 2 }) }),
        'GET /api/posts?limit=20&userId=2': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');

    await user.click(screen.getByRole('button', { name: '検索' }));
    await user.type(screen.getByLabelText('ユーザー名・表示名で検索'), 'jiro');
    await user.click(within(screen.getByRole('search')).getByRole('button', { name: '検索' }));

    await user.click(await screen.findByRole('button', { name: /次郎/ }));

    expect(await screen.findByText('@jiro')).toBeInTheDocument();
  });

  it('ユーザー検索で該当する利用者がいない場合はその旨を表示する', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users?q=nobody': () => ({ status: 200, body: { users: [] } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');

    await user.click(screen.getByRole('button', { name: '検索' }));
    await user.type(screen.getByLabelText('ユーザー名・表示名で検索'), 'nobody');
    await user.click(within(screen.getByRole('search')).getByRole('button', { name: '検索' }));

    expect(await screen.findByText('該当する利用者が見つかりませんでした。')).toBeInTheDocument();
  });

  it('フォローボタンを押すとフォロー中に切り替わりフォロワー数が増える', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: {
            posts: [post({ id: 1, userId: 2, username: 'jiro', displayName: '次郎', isOwnedByMe: false })],
            hasMore: false,
          },
        }),
        'GET /api/users/2': () => ({ status: 200, body: profile({ id: 2, followerCount: 0, followedByMe: false }) }),
        'GET /api/posts?limit=20&userId=2': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'POST /api/users/2/follow': () => ({ status: 200, body: { followedByMe: true, followerCount: 1 } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('次郎');
    await user.click(screen.getByRole('button', { name: '次郎' }));
    await screen.findByRole('button', { name: 'フォローする' });

    await user.click(screen.getByRole('button', { name: 'フォローする' }));

    expect(await screen.findByRole('button', { name: 'フォロー中' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1 フォロワー' })).toBeInTheDocument();
  });

  it('フォロー中の人数をクリックすると一覧が表示される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: {
            posts: [post({ id: 1, userId: 2, username: 'jiro', displayName: '次郎', isOwnedByMe: false })],
            hasMore: false,
          },
        }),
        'GET /api/users/2': () => ({ status: 200, body: profile({ id: 2, followingCount: 1 }) }),
        'GET /api/posts?limit=20&userId=2': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users/2/following': () => ({
          status: 200,
          body: {
            users: [
              {
                id: 3,
                username: 'saburo',
                displayName: '三郎',
                avatarUrl: 'https://example.com/avatars/saburo.jpg',
                followedByMe: false,
              },
            ],
          },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('次郎');
    await user.click(screen.getByRole('button', { name: '次郎' }));
    await screen.findByRole('button', { name: '1 フォロー中' });

    await user.click(screen.getByRole('button', { name: '1 フォロー中' }));

    expect(await screen.findByText('三郎')).toBeInTheDocument();
    expect(screen.getByText('@saburo')).toBeInTheDocument();
    const avatarImg = document.querySelector<HTMLImageElement>('.follow-list img');
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatars/saburo.jpg');
  });

  it('プロフィール編集で自己紹介を保存すると反映される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users/1': () => ({
          status: 200,
          body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true, bio: null }),
        }),
        'GET /api/posts?limit=20&userId=1': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'PUT /api/users/me': () => ({
          status: 200,
          body: profile({
            id: 1,
            username: 'taro',
            displayName: '太郎',
            isOwnedByMe: true,
            bio: 'よろしくお願いします',
          }),
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');
    await user.click(screen.getByRole('button', { name: '太郎' }));
    await user.click(await screen.findByRole('button', { name: 'プロフィールを編集' }));

    const textarea = await screen.findByLabelText('自己紹介（160文字まで）');
    await user.type(textarea, 'よろしくお願いします');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('よろしくお願いします')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
  });

  it('プロフィール編集画面で画像を選択するとアップロードされ、プロフィール画面のアイコンが更新される', async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn(() => 'blob:mock-preview');
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users/1': () => ({
          status: 200,
          body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true, avatarUrl: null }),
        }),
        'GET /api/posts?limit=20&userId=1': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'POST /api/users/me/avatar': () => ({
          status: 200,
          body: profile({
            id: 1,
            username: 'taro',
            displayName: '太郎',
            isOwnedByMe: true,
            avatarUrl: 'https://example.com/avatars/x.jpg',
          }),
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');
    await user.click(screen.getByRole('button', { name: '太郎' }));
    await user.click(await screen.findByRole('button', { name: 'プロフィールを編集' }));

    const file = new File(['dummy'], 'avatar.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('アイコン画像を選択'), file);
    // アップロード完了（avatarUrlがサーバー側の値に更新され「画像を削除」ボタンが現れる）を待ってから戻る
    await screen.findByRole('button', { name: '画像を削除' });
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(await screen.findByRole('img', { name: '太郎のアイコン' })).toHaveAttribute(
      'src',
      'https://example.com/avatars/x.jpg',
    );
  });

  it('プロフィール編集画面で画像を削除するとアイコンがプレースホルダーに戻る', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'GET /api/users/1': () => ({
          status: 200,
          body: profile({
            id: 1,
            username: 'taro',
            displayName: '太郎',
            isOwnedByMe: true,
            avatarUrl: 'https://example.com/avatars/x.jpg',
          }),
        }),
        'GET /api/posts?limit=20&userId=1': () => ({ status: 200, body: { posts: [], hasMore: false } }),
        'DELETE /api/users/me/avatar': () => ({
          status: 200,
          body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true, avatarUrl: null }),
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');
    await user.click(screen.getByRole('button', { name: '太郎' }));
    await user.click(await screen.findByRole('button', { name: 'プロフィールを編集' }));
    await screen.findByRole('img', { name: 'アイコンのプレビュー' });

    await user.click(screen.getByRole('button', { name: '画像を削除' }));
    // 削除完了（avatarUrlがnullに更新され「画像を削除」ボタンが消える）を待ってから戻る
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '画像を削除' })).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByRole('img', { name: '太郎のアイコン' })).not.toBeInTheDocument();
  });

  it('不正な形式の画像を選択するとエラーメッセージが表示されアップロードAPIは呼ばれない', async () => {
    // input[accept]によるブラウザ側フィルタを無効にし、クライアント側の検証（validateImageFile）
    // が効いていることを確認する
    const user = userEvent.setup({ applyAccept: false });
    const fetchMock = mockFetch({
      'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      'GET /api/users/1': () => ({
        status: 200,
        body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true, avatarUrl: null }),
      }),
      'GET /api/posts?limit=20&userId=1': () => ({ status: 200, body: { posts: [], hasMore: false } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('まだ投稿がありません。');
    await user.click(screen.getByRole('button', { name: '太郎' }));
    await user.click(await screen.findByRole('button', { name: 'プロフィールを編集' }));

    const textFile = new File(['dummy'], 'note.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('アイコン画像を選択'), textFile);

    expect(await screen.findByText('画像はjpgまたはpng形式のみ選択できます。')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/users/me/avatar'), expect.anything());
  });

  it('「フォロー中」タブに切り替えるとscope=followingで再取得される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '全体タブの投稿' })], hasMore: false },
        }),
        'GET /api/posts?limit=20&scope=following': () => ({
          status: 200,
          body: { posts: [post({ id: 2, content: 'フォロー中タブの投稿' })], hasMore: false },
        }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('全体タブの投稿');

    await user.click(screen.getByRole('tab', { name: 'フォロー中' }));

    expect(await screen.findByText('フォロー中タブの投稿')).toBeInTheDocument();
    expect(screen.queryByText('全体タブの投稿')).not.toBeInTheDocument();
  });

  it('プロフィール画面の投稿をクリックすると詳細ビューに遷移し「プロフィールに戻る」で戻る', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: {
            posts: [post({ id: 1, userId: 2, username: 'jiro', displayName: '次郎', isOwnedByMe: false })],
            hasMore: false,
          },
        }),
        'GET /api/users/2': () => ({ status: 200, body: profile({ id: 2 }) }),
        'GET /api/posts?limit=20&userId=2': () => ({
          status: 200,
          body: {
            posts: [
              post({
                id: 5,
                userId: 2,
                username: 'jiro',
                displayName: '次郎',
                content: 'プロフィール限定の投稿',
                isOwnedByMe: false,
              }),
            ],
            hasMore: false,
          },
        }),
        'GET /api/posts/5/comments': () => ({ status: 200, body: { comments: [] } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('次郎');
    await user.click(screen.getByRole('button', { name: '次郎' }));
    await screen.findByText('プロフィール限定の投稿');

    await user.click(screen.getByRole('button', { name: 'コメント 0' }));

    expect(await screen.findByRole('button', { name: '← プロフィールに戻る' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '← プロフィールに戻る' }));

    expect(await screen.findByText('プロフィール限定の投稿')).toBeInTheDocument();
  });

  it('回帰テスト：プロフィール発の投稿詳細で削除すると、タイムライン一覧からも消える', async () => {
    // 自分の投稿は「全体」タイムラインにも自分のプロフィールの投稿一覧にも表示される。
    // 投稿データを別々の配列で持っていると、プロフィール側から削除してもタイムライン側には
    // 反映されない不整合が起きていた（投稿データはpostStoreという1箇所にまとめて解消済み）。
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '共有される投稿' })], hasMore: false },
        }),
        'GET /api/users/1': () => ({
          status: 200,
          body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true }),
        }),
        'GET /api/posts?limit=20&userId=1': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '共有される投稿' })], hasMore: false },
        }),
        'GET /api/posts/1/comments': () => ({ status: 200, body: { comments: [] } }),
        'DELETE /api/posts/1': () => ({ status: 204 }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('共有される投稿');

    const header = document.querySelector<HTMLElement>('.timeline-header');
    if (!header) throw new Error('header not found');
    await user.click(within(header).getByRole('button', { name: '太郎' }));

    await user.click(await screen.findByRole('button', { name: 'コメント 0' }));
    await screen.findByRole('button', { name: '← プロフィールに戻る' });

    await user.click(screen.getByRole('button', { name: '削除' }));
    const dialog = await screen.findByRole('dialog', { name: '投稿を削除' });
    await user.click(within(dialog).getByRole('button', { name: '削除' }));

    // 削除後はプロフィール（開いた元の画面）に戻り、投稿一覧が空になる
    expect(await screen.findByText('まだ投稿がありません。')).toBeInTheDocument();

    // タイムラインへ戻ったとき、削除したはずの投稿が残っていないことを確認する
    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));
    expect(screen.queryByText('共有される投稿')).not.toBeInTheDocument();
    expect(screen.getByText('まだ投稿がありません。')).toBeInTheDocument();
  });

  it('回帰テスト：プロフィールの投稿一覧でいいねすると、タイムライン一覧にも反映される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '共有される投稿', likeCount: 0, likedByMe: false })], hasMore: false },
        }),
        'GET /api/users/1': () => ({
          status: 200,
          body: profile({ id: 1, username: 'taro', displayName: '太郎', isOwnedByMe: true }),
        }),
        'GET /api/posts?limit=20&userId=1': () => ({
          status: 200,
          body: { posts: [post({ id: 1, content: '共有される投稿', likeCount: 0, likedByMe: false })], hasMore: false },
        }),
        'POST /api/posts/1/likes': () => ({ status: 200, body: { likeCount: 1, likedByMe: true } }),
      }),
    );

    render(
      <TimelineScreen
        currentUser={currentUser}
        onLogout={vi.fn()}
        logoutSubmitting={false}
        onCurrentUserAvatarChange={vi.fn()}
      />,
    );
    await screen.findByText('共有される投稿');

    const header = document.querySelector<HTMLElement>('.timeline-header');
    if (!header) throw new Error('header not found');
    await user.click(within(header).getByRole('button', { name: '太郎' }));

    await user.click(await screen.findByRole('button', { name: 'いいね 0' }));
    expect(await screen.findByRole('button', { name: 'いいね 1' })).toHaveAttribute('aria-pressed', 'true');

    // タイムラインに戻ると、同じ投稿のいいね状態が反映されている
    await user.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));
    expect(await screen.findByRole('button', { name: 'いいね 1' })).toHaveAttribute('aria-pressed', 'true');
  });
});
