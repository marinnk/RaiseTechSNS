// バックエンドAPIを直接叩くヘルパー群。Playwrightの`APIRequestContext`
// （`page.request`・`context.request`）はページと同じCookie（access_token・refresh_token）を
// 共有するため、手動でのCookie注入は不要（docs/basic-design.md §3の認証方式を参照）。
//
// 「検証対象ではない前提データ」（例：フォロー一覧テストにおけるフォロー関係そのもの）は
// UIを2回操作するのではなく、これらのAPIヘルパーで用意する。UIは検証対象の操作のみで駆動する。

import type { APIRequestContext } from '@playwright/test';
import { randomE2eUsername, type TestUser } from './testUser';

// 8〜100文字というバックエンドのパスワード制約（RegisterRequest）を満たす固定パスワード
const PASSWORD = 'E2ePassw0rd!';

// Playwrightの`request`/`page.request`はplaywright.config.tsの`use.baseURL`（frontend、5173番）を
// 基準に相対パスを解決するため、`/api/...`のような相対パスのままではbackend（8080番）ではなく
// frontendへリクエストしてしまう（VITE_API_BASE_URLはフロントエンドのJS内fetchが使う設定であり、
// Viteの開発サーバー自体は/apiをbackendへプロキシしない）。そのためAPIヘルパーは常に
// backendの絶対URLを組み立てる。
const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:8080';

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

interface AuthUserResponse {
  id: number;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * POST /api/auth/registerでe2e_プレフィックス付きの新規ユーザーを登録する。
 * バックエンド（AuthController.register）は登録時点でログインと同じくCookieを発行するため
 * （access_token・refresh_token）、登録後に別途ログインを呼ぶ必要はない。
 */
export async function registerUser(
  request: APIRequestContext,
  overrides: Partial<{ username: string; email: string }> = {},
): Promise<TestUser> {
  const username = overrides.username ?? randomE2eUsername();
  const email = overrides.email ?? `${username}@example.com`;

  const res = await request.post(apiUrl('/api/auth/register'), {
    data: { username, email, password: PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`registerUser failed: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as AuthUserResponse;
  return { id: body.id, username, email, password: PASSWORD, displayName: body.displayName };
}

/** POST /api/auth/login。登録済みユーザーで別途ログインし直したい場合に使う。 */
export async function loginViaApi(
  request: APIRequestContext,
  user: Pick<TestUser, 'email' | 'password'>,
): Promise<void> {
  const res = await request.post(apiUrl('/api/auth/login'), {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    throw new Error(`loginViaApi failed: ${res.status()} ${await res.text()}`);
  }
}

interface PostResponse {
  id: number;
  userId: number;
  content: string;
}

/**
 * POST /api/posts（テキストのみ）。バックエンドはテキストのみの投稿でも
 * multipart/form-dataを要求する（`data`パートにJSON、`images`パートは省略可）。
 * frontend/src/api/posts.tsのtoFormDataと同じ形。
 */
export async function createPost(request: APIRequestContext, content: string): Promise<number> {
  const res = await request.post(apiUrl('/api/posts'), {
    multipart: {
      data: {
        name: 'data.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ content })),
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`createPost failed: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as PostResponse;
  return body.id;
}

/** 無限スクロール検証用に、指定件数の投稿を連番付きで作成する。 */
export async function createManyPosts(
  request: APIRequestContext,
  count: number,
  prefix = 'e2e infinite-scroll post',
): Promise<void> {
  for (let i = 0; i < count; i++) {
    await createPost(request, `${prefix} #${i + 1}`);
  }
}

/** POST /api/users/{userId}/follow */
export async function followUser(request: APIRequestContext, userId: number): Promise<void> {
  const res = await request.post(apiUrl(`/api/users/${userId}/follow`));
  if (!res.ok()) {
    throw new Error(`followUser failed: ${res.status()} ${await res.text()}`);
  }
}

/** POST /api/posts/{postId}/likes */
export async function likePost(request: APIRequestContext, postId: number): Promise<void> {
  const res = await request.post(apiUrl(`/api/posts/${postId}/likes`));
  if (!res.ok()) {
    throw new Error(`likePost failed: ${res.status()} ${await res.text()}`);
  }
}

/** POST /api/posts/{postId}/comments */
export async function commentOnPost(request: APIRequestContext, postId: number, content: string): Promise<void> {
  const res = await request.post(apiUrl(`/api/posts/${postId}/comments`), { data: { content } });
  if (!res.ok()) {
    throw new Error(`commentOnPost failed: ${res.status()} ${await res.text()}`);
  }
}
