import { describe, expect, it } from 'vitest';
import { validateImageFile } from './imageFile';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function fileOf(sizeBytes: number, type: string): File {
  return new File([new Uint8Array(sizeBytes)], 'test-image', { type });
}

describe('validateImageFile', () => {
  it('jpg・png形式で5MB以下なら妥当（null）', () => {
    expect(validateImageFile(fileOf(1024, 'image/jpeg'))).toBeNull();
    expect(validateImageFile(fileOf(1024, 'image/png'))).toBeNull();
  });

  it('jpg・png以外の形式はエラーメッセージを返す', () => {
    expect(validateImageFile(fileOf(1024, 'image/gif'))).toBe('画像はjpgまたはpng形式のみ選択できます。');
    expect(validateImageFile(fileOf(1024, 'application/pdf'))).toBe('画像はjpgまたはpng形式のみ選択できます。');
  });

  it('サイズが5MBちょうどなら妥当（境界値）', () => {
    expect(validateImageFile(fileOf(MAX_IMAGE_SIZE_BYTES, 'image/jpeg'))).toBeNull();
  });

  it('サイズが5MBを1バイトでも超えるとエラーメッセージを返す（境界値）', () => {
    expect(validateImageFile(fileOf(MAX_IMAGE_SIZE_BYTES + 1, 'image/jpeg'))).toBe('画像は5MB以下にしてください。');
  });

  it('形式・サイズの両方が不正な場合は形式チェックが優先される', () => {
    expect(validateImageFile(fileOf(MAX_IMAGE_SIZE_BYTES + 1, 'image/gif'))).toBe(
      '画像はjpgまたはpng形式のみ選択できます。',
    );
  });
});
