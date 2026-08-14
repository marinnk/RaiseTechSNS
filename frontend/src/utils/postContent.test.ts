import { describe, expect, it } from 'vitest';
import { isValidPostContent, MAX_POST_CONTENT_LENGTH } from './postContent';

describe('isValidPostContent', () => {
  it('空文字は不正', () => {
    expect(isValidPostContent('')).toBe(false);
  });

  it('空白のみは不正', () => {
    expect(isValidPostContent('   ')).toBe(false);
    expect(isValidPostContent('\n\t')).toBe(false);
  });

  it('通常の1文字は妥当', () => {
    expect(isValidPostContent('あ')).toBe(true);
  });

  it('279文字（上限-1）は妥当（境界値）', () => {
    expect(isValidPostContent('a'.repeat(MAX_POST_CONTENT_LENGTH - 1))).toBe(true);
  });

  it('280文字（上限ちょうど）は妥当（境界値）', () => {
    expect(isValidPostContent('a'.repeat(MAX_POST_CONTENT_LENGTH))).toBe(true);
  });

  it('281文字（上限+1）は不正（境界値）', () => {
    expect(isValidPostContent('a'.repeat(MAX_POST_CONTENT_LENGTH + 1))).toBe(false);
  });

  it('前後の空白を含んでいても、trim後に文字数が上限以内なら妥当', () => {
    expect(isValidPostContent('  こんにちは  ')).toBe(true);
  });

  it('trim後の文字数は上限以内でも、元の文字数（空白込み）が上限を超えていれば不正', () => {
    const content = ` ${'a'.repeat(MAX_POST_CONTENT_LENGTH - 1)} `; // 元の長さは281、trim後は279
    expect(content.length).toBe(MAX_POST_CONTENT_LENGTH + 1);
    expect(isValidPostContent(content)).toBe(false);
  });
});
