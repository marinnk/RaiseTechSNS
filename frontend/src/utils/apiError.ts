import { ApiError } from '../api/client';

/**
 * catchしたエラーがApiError（バックエンドが返した`ProblemDetail`由来のメッセージ）なら
 * そのメッセージを、そうでなければ引数のfallbackメッセージを返す。各hookで個別に
 * 同じ実装を書いていたものを1箇所にまとめたもの。
 */
export function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
