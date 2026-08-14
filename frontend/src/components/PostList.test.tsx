import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostList } from './PostList';
import { installIntersectionObserverMock, MockIntersectionObserver } from '../testUtils/mockIntersectionObserver';
import { post } from '../testUtils/postFixture';

function renderPostList(overrides: Partial<React.ComponentProps<typeof PostList>> = {}) {
  return render(
    <PostList
      posts={[]}
      hasMore={false}
      loadingMore={false}
      onLoadMore={vi.fn()}
      onEdit={vi.fn().mockResolvedValue(true)}
      onDelete={vi.fn().mockResolvedValue(true)}
      onToggleLike={vi.fn()}
      isTogglingLike={() => false}
      onOpenDetail={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PostList', () => {
  beforeEach(() => {
    installIntersectionObserverMock();
  });

  it('投稿が無ければ空メッセージを表示する', () => {
    renderPostList({ posts: [] });

    expect(screen.getByText('まだ投稿がありません。')).toBeInTheDocument();
  });

  it('投稿があれば一覧表示する', () => {
    renderPostList({ posts: [post({ id: 1, content: '1件目' }), post({ id: 2, content: '2件目' })] });

    expect(screen.getByText('1件目')).toBeInTheDocument();
    expect(screen.getByText('2件目')).toBeInTheDocument();
  });

  it('hasMore=falseならsentinelを監視しない', () => {
    renderPostList({ posts: [post({ id: 1 })], hasMore: false });

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('hasMore=trueならsentinelを監視し、可視化されるとonLoadMoreが呼ばれる', async () => {
    const onLoadMore = vi.fn();
    renderPostList({ posts: [post({ id: 1 })], hasMore: true, onLoadMore });

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const observer = MockIntersectionObserver.instances[0];
    await act(async () => {
      observer.trigger(true);
    });

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('sentinelが交差してもisIntersecting=falseならonLoadMoreは呼ばれない', async () => {
    const onLoadMore = vi.fn();
    renderPostList({ posts: [post({ id: 1 })], hasMore: true, onLoadMore });

    const observer = MockIntersectionObserver.instances[0];
    await act(async () => {
      observer.trigger(false);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('loadingMore=trueのときは末尾に読み込み中と表示する', () => {
    renderPostList({ posts: [post({ id: 1 })], hasMore: true, loadingMore: true });

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('loadingMore=falseのときは読み込み中と表示しない', () => {
    renderPostList({ posts: [post({ id: 1 })], hasMore: true, loadingMore: false });

    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
  });

  it('isTogglingLikeは投稿ごとのidで呼び分けられる', () => {
    const isTogglingLike = vi.fn((postId: number) => postId === 2);
    renderPostList({
      posts: [
        post({ id: 1, content: '1件目', likeCount: 0, likedByMe: false }),
        post({ id: 2, content: '2件目', likeCount: 0, likedByMe: false }),
      ],
      isTogglingLike,
    });

    expect(isTogglingLike).toHaveBeenCalledWith(1);
    expect(isTogglingLike).toHaveBeenCalledWith(2);
    // id=2の投稿だけtoggling中としていいねボタンが無効化される
    const likeButtons = screen.getAllByRole('button', { name: /いいね/ });
    expect(likeButtons[0]).not.toBeDisabled();
    expect(likeButtons[1]).toBeDisabled();
  });
});
