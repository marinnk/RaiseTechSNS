import { useEffect, useMemo } from 'react';

/**
 * 選択中のファイル配列から、プレビュー表示用のobject URLを作る共通フック。
 * `ProfileEditForm`（アバター、1枚）・`PostImagePicker`（投稿画像、複数枚）の両方で使う
 * （createObjectURL/revokeObjectURLのライフサイクル管理が2箇所に重複していたものを集約した）。
 *
 * `files`が変わるたびに前回分のURLをすべて破棄してから作り直し、アンマウント時にも必ず破棄する
 * ことで、object URLのリーク（メモリ解放されないまま残り続けること）を防ぐ。
 *
 * 呼び出し側は、依存配列で見た目の変化を無駄に検知してしまわないよう、`files`に安定した配列参照
 * （`useState`で保持した配列そのもの、または`useMemo`で作った配列）を渡すこと。呼び出しのたびに
 * 新しい配列リテラル（例：`file ? [file] : []`をメモ化せずそのまま渡す）を渡すと、内容が同じでも
 * 毎レンダーでURLを作り直してしまう。
 */
export function useObjectUrlPreviews(files: File[]): string[] {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [urls]);

  return urls;
}
