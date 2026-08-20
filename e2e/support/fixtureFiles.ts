// 画像バリデーション系のシナリオで使う、固定のテスト用ファイル。
//
// 有効な画像（jpg/png、数KB）と不正なファイル（.txt）は小さいためリポジトリにコミットする。
// 5MB超の巨大ファイルはコミットせず、必要なテストがその場でBufferを動的生成する
// （oversizedImageBuffer参照）。

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures-files');

export const VALID_JPG = path.join(FIXTURES_DIR, 'valid-small.jpg');
export const VALID_PNG = path.join(FIXTURES_DIR, 'valid-small.png');
export const INVALID_TXT = path.join(FIXTURES_DIR, 'invalid.txt');

// utils/imageFile.ts（フロントエンド）の5MB制限を1バイトだけ超えるダミーファイル。
// 中身の妥当性（実際に画像として解釈できるか）はクライアント側バリデーションでは見ておらず、
// サイズだけをチェックしているため、ランダムなバイト列で十分。
export function oversizedImageFile(): { name: string; mimeType: string; buffer: Buffer } {
  const FIVE_MB = 5 * 1024 * 1024;
  return {
    name: 'oversized.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(FIVE_MB + 1, 0),
  };
}
