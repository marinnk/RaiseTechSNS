const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

/**
 * 選択された画像ファイルが送信可能かどうかを検証する。バックエンド（ImageValidation）と
 * 同じ制約（jpg/png、5MB以下）をクライアント側でも事前チェックし、UXを改善する目的。
 * 最終的な防衛はバックエンド側のバリデーションで行う。
 *
 * @returns 妥当なら`null`、不正ならユーザーに表示するエラーメッセージ
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return '画像はjpgまたはpng形式のみ選択できます。';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return '画像は5MB以下にしてください。';
  }
  return null;
}
