const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

// これらのパス自身が401を返した場合はリフレッシュを試みない
// （login/registerの401は認証情報の誤りであってセッション切れではなく、
//  refresh自身の401はリフレッシュトークンが無効ということなので、これ以上リトライしても無意味なため）
const NO_REFRESH_RETRY_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string' && body.detail) {
      return body.detail;
    }
  } catch {
    // ボディが空、またはJSONでない場合はここに来る。フォールバックメッセージを使う
  }
  return `API error ${res.status}`;
}

// 複数のリクエストが同時に401を受け取っても、リフレッシュ自体は1回だけ実行する
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * fetchの共通処理。credentials: 'include'でCookie（アクセストークン・リフレッシュトークン）を
 * 送受信し、401が返ってきた場合はアクセストークンの有効期限切れとみなして
 * POST /api/auth/refresh を1回だけ試み、成功すれば元のリクエストを1回だけ再試行する。
 */
async function request(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, { ...init, credentials: 'include' });
  if (res.status === 401 && !NO_REFRESH_RETRY_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return fetch(`${BASE_URL}${path}`, { ...init, credentials: 'include' });
    }
  }
  return res;
}

async function throwIfError(res: Response): Promise<void> {
  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await request(path, { method: 'GET' });
  await throwIfError(res);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfError(res);
  return res.json() as Promise<T>;
}

/**
 * レスポンスボディが無い（204 No Content等）POSTリクエスト用。
 * apiPostと違い、成功時に`.json()`を呼ばない。
 */
export async function apiPostNoContent(path: string, body?: unknown): Promise<void> {
  const res = await request(path, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  await throwIfError(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await request(path, { method: 'DELETE' });
  await throwIfError(res);
}
