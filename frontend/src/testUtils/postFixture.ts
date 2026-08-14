import type { Post } from '../types/post';

/**
 * テスト用のPostオブジェクトを組み立てるファクトリ。複数のhooks・componentsのテストで
 * 同じ形のダミーデータが必要になるため、ここに集約する（`Post`型にフィールドが増減した
 * 場合も、ここ1箇所を直せば済むようにするため）。
 */
export function post(overrides: Partial<Post> = {}): Post {
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
    images: [],
    ...overrides,
  };
}
