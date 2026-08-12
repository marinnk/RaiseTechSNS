import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { mockFetch } from './testUtils/mockFetch';

const authUserBody = { id: 1, username: 'taro', displayName: 'taro', email: 'taro@example.com' };
const emptyPostListBody = { posts: [], hasMore: false };

describe('App', () => {
  it('初期表示でセッションが無ければログイン画面が表示される', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 401, body: { detail: 'unauthorized' } }),
        'POST /api/auth/refresh': () => ({ status: 401, body: { detail: 'refresh token is missing' } }),
      }),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'RaiseTechSNS' })).toBeInTheDocument();
  });

  it('セッションが有効なら初期表示でタイムライン画面が表示される（リロード時のセッション維持相当）', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 200, body: authUserBody }),
        'GET /api/posts?limit=20': () => ({ status: 200, body: emptyPostListBody }),
      }),
    );

    render(<App />);

    expect(await screen.findByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('ログインに成功するとタイムライン画面に遷移する', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 401 }),
        'POST /api/auth/refresh': () => ({ status: 401 }),
        'POST /api/auth/login': () => ({ status: 200, body: authUserBody }),
        'GET /api/posts?limit=20': () => ({ status: 200, body: emptyPostListBody }),
      }),
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'RaiseTechSNS' });

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'password1');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(await screen.findByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('「新規登録はこちら」から新規登録画面に切り替えられる', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 401 }),
        'POST /api/auth/refresh': () => ({ status: 401 }),
      }),
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'RaiseTechSNS' });

    await user.click(screen.getByRole('button', { name: '新規登録はこちら' }));

    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
  });

  it('ログインに失敗するとエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 401 }),
        'POST /api/auth/refresh': () => ({ status: 401 }),
        'POST /api/auth/login': () => ({ status: 401, body: { detail: 'email or password is incorrect' } }),
      }),
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'RaiseTechSNS' });

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(await screen.findByText('email or password is incorrect')).toBeInTheDocument();
  });

  it('ログイン失敗後に新規登録画面へ切り替えると、ログイン画面のエラーは引き継がれない', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 401 }),
        'POST /api/auth/refresh': () => ({ status: 401 }),
        'POST /api/auth/login': () => ({ status: 401, body: { detail: 'email or password is incorrect' } }),
      }),
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'RaiseTechSNS' });

    await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    await screen.findByText('email or password is incorrect');

    await user.click(screen.getByRole('button', { name: '新規登録はこちら' }));

    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.queryByText('email or password is incorrect')).not.toBeInTheDocument();
  });

  it('ログアウトするとログイン画面に戻る', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/me': () => ({ status: 200, body: authUserBody }),
        'GET /api/posts?limit=20': () => ({ status: 200, body: emptyPostListBody }),
        'POST /api/auth/logout': () => ({ status: 204 }),
      }),
    );

    render(<App />);
    await screen.findByRole('button', { name: 'ログアウト' });

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));

    expect(await screen.findByRole('heading', { name: 'RaiseTechSNS' })).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
  });

  it('アクセストークンが期限切れでもリフレッシュに成功すればログイン状態を保てる', async () => {
    let meCallCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        const path = url.replace('http://localhost:8080', '');
        const method = init?.method ?? 'GET';

        if (method === 'GET' && path === '/api/auth/me') {
          meCallCount += 1;
          if (meCallCount === 1) {
            return { ok: false, status: 401, json: async () => ({ detail: 'unauthorized' }) } as Response;
          }
          return { ok: true, status: 200, json: async () => authUserBody } as Response;
        }
        if (method === 'POST' && path === '/api/auth/refresh') {
          return { ok: true, status: 200, json: async () => authUserBody } as Response;
        }
        if (method === 'GET' && path === '/api/posts?limit=20') {
          return { ok: true, status: 200, json: async () => emptyPostListBody } as Response;
        }
        throw new Error(`unexpected fetch call: ${method} ${path}`);
      }),
    );

    render(<App />);

    expect(await screen.findByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    expect(meCallCount).toBe(2);
  });
});
