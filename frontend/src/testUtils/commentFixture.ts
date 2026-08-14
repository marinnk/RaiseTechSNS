import type { Comment } from '../types/comment';

/**
 * テスト用のCommentオブジェクトを組み立てるファクトリ。複数のhooks・componentsのテストで
 * 同じ形のダミーデータが必要になるため、ここに集約する（`Comment`型にフィールドが増減した
 * 場合も、ここ1箇所を直せば済むようにするため。frontend/src/testUtils/postFixture.tsと同じ考え方）。
 */
export function comment(overrides: Partial<Comment> = {}): Comment {
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
