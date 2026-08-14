import { describe, expect, it } from 'vitest';
import { toErrorMessage } from './apiError';
import { ApiError } from '../api/client';

describe('toErrorMessage', () => {
  it('ApiErrorならそのmessageを返す', () => {
    const err = new ApiError(400, 'バックエンドからのメッセージ');

    expect(toErrorMessage(err, 'フォールバック')).toBe('バックエンドからのメッセージ');
  });

  it('ApiError以外（Errorインスタンス）ならfallbackを返す', () => {
    const err = new Error('ネットワークエラー');

    expect(toErrorMessage(err, 'フォールバック')).toBe('フォールバック');
  });

  it('Errorですらない値（string等をthrowした場合）でもfallbackを返す', () => {
    expect(toErrorMessage('文字列がthrowされた', 'フォールバック')).toBe('フォールバック');
    expect(toErrorMessage(undefined, 'フォールバック')).toBe('フォールバック');
  });
});
