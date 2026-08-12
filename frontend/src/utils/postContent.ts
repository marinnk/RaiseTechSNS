export const MAX_POST_CONTENT_LENGTH = 280;

/**
 * 投稿本文として送信可能かどうかを判定する。空文字（空白のみ含む）・文字数超過を弾く。
 * PostForm（新規作成）・PostEditForm（編集）の両方から使う共通ルール。
 */
export function isValidPostContent(content: string): boolean {
  return content.trim().length > 0 && content.length <= MAX_POST_CONTENT_LENGTH;
}
