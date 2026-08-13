import { useEffect, useRef } from 'react';
import type { Post } from '../types/post';
import { PostItem } from './PostItem';

interface PostListProps {
  posts: Post[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onEdit: (postId: number, content: string, keepImageIds: number[], newImages: File[]) => Promise<boolean>;
  onDelete: (postId: number) => Promise<boolean>;
  onToggleLike: (post: Post) => void;
  isTogglingLike: (postId: number) => boolean;
  onOpenDetail: (postId: number) => void;
  onOpenProfile?: (userId: number) => void;
}

export function PostList({
  posts,
  hasMore,
  loadingMore,
  onLoadMore,
  onEdit,
  onDelete,
  onToggleLike,
  isTogglingLike,
  onOpenDetail,
  onOpenProfile,
}: PostListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 一覧末尾の監視対象（sentinel）が画面内に入ったら、次のページを自動で読み込む（無限スクロール）。
  // 多重呼び出しの防止はusePosts側のloadMoreが担うため、ここでは交差検知だけを行う。
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        onLoadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (posts.length === 0) {
    return <p className="post-list-empty">まだ投稿がありません。</p>;
  }

  return (
    <div className="post-list">
      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleLike={onToggleLike}
          isTogglingLike={isTogglingLike(post.id)}
          onOpenDetail={onOpenDetail}
          onOpenProfile={onOpenProfile}
        />
      ))}
      <div ref={sentinelRef} className="post-list-sentinel">
        {loadingMore && <p className="text-sub">読み込み中...</p>}
      </div>
    </div>
  );
}
