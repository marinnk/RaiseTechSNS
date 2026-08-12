import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineScreen } from './TimelineScreen';
import { mockFetch } from '../testUtils/mockFetch';
import { installIntersectionObserverMock, MockIntersectionObserver } from '../testUtils/mockIntersectionObserver';
import type { Post } from '../types/post';

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    userId: 1,
    username: 'taro',
    displayName: '太郎',
    content: '投稿本文',
    createdAt: '2026-08-10T10:00:00',
    updatedAt: '2026-08-10T10:00:00',
    isOwnedByMe: true,
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);

    expect(await screen.findByText('一件目の投稿')).toBeInTheDocument();
  });

  it('投稿がまだ無い場合は空メッセージが表示される', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/posts?limit=20': () => ({ status: 200, body: { posts: [], hasMore: false } }),
      }),
    );

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);

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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
    await screen.findByText('唯一の投稿');

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('ポーリング間隔経過後に新着投稿が一覧の先頭に追加される', async () => {
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

    render(<TimelineScreen onLogout={vi.fn()} logoutSubmitting={false} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('元の投稿')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.getByText('新着投稿')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
