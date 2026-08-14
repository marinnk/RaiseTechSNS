import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useObjectUrlPreviews } from './useObjectUrlPreviews';

function file(name: string): File {
  return new File(['dummy'], name, { type: 'image/jpeg' });
}

describe('useObjectUrlPreviews', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let counter = 0;

  beforeEach(() => {
    counter = 0;
    createObjectURLSpy = vi.fn(() => `blob:mock-url-${++counter}`);
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filesが空なら空配列を返す', () => {
    const { result } = renderHook(() => useObjectUrlPreviews([]));

    expect(result.current).toEqual([]);
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it('filesの各ファイルに対してobject URLを作る', () => {
    const files = [file('a.jpg'), file('b.jpg')];
    const { result } = renderHook(() => useObjectUrlPreviews(files));

    expect(result.current).toEqual(['blob:mock-url-1', 'blob:mock-url-2']);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
  });

  it('filesの配列参照が変わると、前回分のURLを破棄してから作り直す', () => {
    const { rerender } = renderHook(({ files }) => useObjectUrlPreviews(files), {
      initialProps: { files: [file('a.jpg')] },
    });
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    rerender({ files: [file('b.jpg')] });

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url-1');
    expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
  });

  it('アンマウント時に作成済みのURLをすべて破棄する', () => {
    const files = [file('a.jpg'), file('b.jpg')];
    const { unmount } = renderHook(() => useObjectUrlPreviews(files));

    unmount();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url-1');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url-2');
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
  });
});
