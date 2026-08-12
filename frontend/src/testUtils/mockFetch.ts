import { vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';

export type MockResponse = { status: number; body?: unknown };

/**
 * `メソッド パス`をキーとしたレスポンスのマップから、fetchの簡易モックを作る。
 * App.test.tsx で最初に作られたヘルパーを、他のテストからも使えるよう切り出したもの。
 */
export function mockFetch(responses: Record<string, () => MockResponse>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const path = url.replace(BASE_URL, '');
    const method = init?.method ?? 'GET';
    const key = `${method} ${path}`;
    const handler = responses[key];
    if (!handler) {
      throw new Error(`unexpected fetch call: ${key}`);
    }
    const { status, body } = handler();
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
}
