import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiDelete,
  apiDeleteWithResponse,
  apiGet,
  apiPost,
  apiPostMultipart,
  apiPostNoContent,
  apiPut,
  apiPutMultipart,
  ApiError,
} from './client';

const BASE_URL = 'http://localhost:8080';

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function emptyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('no body');
    },
  } as unknown as Response;
}

describe('api/client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('apiGetはcredentials: includeでリクエストし、レスポンスのJSONを返す', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    const result = await apiGet<{ id: number }>('/api/posts');

    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/posts`, {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('apiPostはContent-Type: application/jsonとJSON化したbodyを送る', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));

    await apiPost('/api/posts', { content: 'hello' });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
      credentials: 'include',
    });
  });

  it('apiPutはPUTメソッドでJSON化したbodyを送る', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));

    await apiPut('/api/users/me', { bio: 'よろしく' });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio: 'よろしく' }),
      credentials: 'include',
    });
  });

  it('レスポンスがエラー（ok: false）だと、bodyのdetailをmessageとしたApiErrorをthrowする', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { detail: '入力内容に誤りがあります。' }));

    await expect(apiGet('/api/posts')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: '入力内容に誤りがあります。',
    });
  });

  it('エラーレスポンスのbodyがJSONでない・空の場合はフォールバックメッセージのApiErrorをthrowする', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(500));

    await expect(apiGet('/api/posts')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'API error 500',
    });
  });

  it('エラーレスポンスのbodyにdetailが無い場合もフォールバックメッセージになる', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { title: 'Not Found' }));

    await expect(apiGet('/api/posts')).rejects.toMatchObject({ message: 'API error 404' });
  });

  it('401を受け取るとリフレッシュを試み、成功すれば元のリクエストを1回だけ再試行する', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {})) // 元のリクエスト
      .mockResolvedValueOnce(jsonResponse(200, {})) // refresh成功
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 })); // 再試行

    const result = await apiGet<{ id: number }>('/api/posts');

    expect(result).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, `${BASE_URL}/api/posts`, {
      method: 'GET',
      credentials: 'include',
    });
  });

  it('401を受け取りリフレッシュが失敗すると、元の401レスポンスに基づいてApiErrorをthrowする（再試行しない）', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'セッションが切れました。' })) // 元のリクエスト
      .mockResolvedValueOnce(jsonResponse(401, {})); // refresh失敗

    await expect(apiGet('/api/posts')).rejects.toMatchObject({ status: 401, message: 'セッションが切れました。' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('リフレッシュ自体がネットワークエラーで失敗した場合もリフレッシュ失敗として扱う', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'セッションが切れました。' }))
      .mockRejectedValueOnce(new Error('network error'));

    await expect(apiGet('/api/posts')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['/api/auth/login', '/api/auth/register', '/api/auth/refresh'])(
    '%sの401ではリフレッシュを試みない',
    async (path) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: '認証に失敗しました。' }));

      await expect(apiGet(path)).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('同時に複数のリクエストが401を受け取っても、リフレッシュ自体は1回だけ実行される', async () => {
    let resolveRefresh: (res: Response) => void = () => {};
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {})) // 1件目: 元のリクエスト
      .mockResolvedValueOnce(jsonResponse(401, {})) // 2件目: 元のリクエスト
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        }),
      ) // refresh（1回のみ発行されるはず）
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 })) // 1件目の再試行
      .mockResolvedValueOnce(jsonResponse(200, { id: 2 })); // 2件目の再試行

    const promise1 = apiGet<{ id: number }>('/api/posts');
    const promise2 = apiGet<{ id: number }>('/api/comments');

    // 両方が401を受け取り、refreshSession()を呼ぶまでマイクロタスクを進める
    // （refreshのfetch自体は未解決のまま止まっているので、進めすぎても問題ない）
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
    resolveRefresh(jsonResponse(200, {}));

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toEqual({ id: 1 });
    expect(result2).toEqual({ id: 2 });
    // 元のリクエスト2回 + refresh1回 + 再試行2回 = 5回
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url === `${BASE_URL}/api/auth/refresh`);
    expect(refreshCalls).toHaveLength(1);
  });

  it('apiPostMultipartはContent-Typeヘッダーを付けずFormDataをそのまま送る', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 1 }));
    const formData = new FormData();
    formData.append('data', 'value');

    await apiPostMultipart('/api/posts', formData);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/posts`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
  });

  it('apiPutMultipartはPUTメソッドでContent-Typeヘッダーを付けずFormDataを送る', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }));
    const formData = new FormData();

    await apiPutMultipart('/api/posts/1', formData);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/posts/1`, {
      method: 'PUT',
      body: formData,
      credentials: 'include',
    });
  });

  it('apiPostNoContentはbody省略時、Content-Typeヘッダーもbodyも付けない', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(204));

    await apiPostNoContent('/api/auth/logout');

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: undefined,
      body: undefined,
      credentials: 'include',
    });
  });

  it('apiPostNoContentはbody指定時、Content-Typeヘッダーを付けてJSON化して送る', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(204));

    await apiPostNoContent('/api/some-endpoint', { foo: 'bar' });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/some-endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
      credentials: 'include',
    });
  });

  it('apiDeleteはレスポンスボディを読まない（voidを返す）', async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(204));

    await expect(apiDelete('/api/posts/1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/api/posts/1`, { method: 'DELETE', credentials: 'include' });
  });

  it('apiDeleteWithResponseはレスポンスボディをJSONとして返す', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { likeCount: 0, likedByMe: false }));

    const result = await apiDeleteWithResponse<{ likeCount: number; likedByMe: boolean }>('/api/posts/1/likes');

    expect(result).toEqual({ likeCount: 0, likedByMe: false });
  });

  it('ApiErrorはstatusとmessageを保持しErrorのインスタンスである', () => {
    const err = new ApiError(403, '権限がありません。');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(403);
    expect(err.message).toBe('権限がありません。');
  });
});
