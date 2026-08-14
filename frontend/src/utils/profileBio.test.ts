import { describe, expect, it } from 'vitest';
import { isValidBio, MAX_BIO_LENGTH } from './profileBio';

describe('isValidBio', () => {
  it('空文字は妥当（自己紹介の未設定を許容する）', () => {
    expect(isValidBio('')).toBe(true);
  });

  it('通常の文字列は妥当', () => {
    expect(isValidBio('よろしくお願いします')).toBe(true);
  });

  it('159文字（上限-1）は妥当（境界値）', () => {
    expect(isValidBio('a'.repeat(MAX_BIO_LENGTH - 1))).toBe(true);
  });

  it('160文字（上限ちょうど）は妥当（境界値）', () => {
    expect(isValidBio('a'.repeat(MAX_BIO_LENGTH))).toBe(true);
  });

  it('161文字（上限+1）は不正（境界値）', () => {
    expect(isValidBio('a'.repeat(MAX_BIO_LENGTH + 1))).toBe(false);
  });
});
