export const MAX_BIO_LENGTH = 160;

/**
 * 自己紹介として送信可能かどうかを判定する。投稿本文と違い、空文字（自己紹介の未設定）は
 * 許容する。文字数超過のみを弾く。
 */
export function isValidBio(bio: string): boolean {
  return bio.length <= MAX_BIO_LENGTH;
}
