/**
 * ISO日時文字列を画面表示用の日付（例：2026-08-10）にフォーマットする。
 * タイムライン画面のワイヤーフレーム通り、時刻は含めず日付のみを表示する。
 *
 * `new Date(isoString)`はタイムゾーン情報（オフセットまたは`Z`）を含まない文字列を
 * ブラウザのローカルタイムとして解釈してしまうため、`isoString`はサーバー・ブラウザの
 * タイムゾーン設定に依らず同じ日時に解釈できるよう、必ずオフセット付きの文字列であることを前提とする
 * （バックエンドはOffsetDateTimeを返すため、この前提を満たす）。
 * 変換後の日付はブラウザのローカルタイムゾーンで表示する。
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
