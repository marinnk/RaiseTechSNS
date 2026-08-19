// フォロワー一覧取得（GET /api/users/{userId}/followers）の負荷試験。
//
// docs/basic-design.mdでは「学習用途規模のデータ量を前提」に、このエンドポイントは
// 意図的にページネーションを実装していない（安全のためのLIMITのみ）。フォロワー数が
// 増えるとレスポンスサイズ・クエリ時間がどう変化するか、意図的な設計上の弱点を確認する
// ためのシナリオ。
import http from 'k6/http';
import { check } from 'k6';
import type { Options } from 'k6/options';

import { BASE_URL, POPULAR_USERNAME, SEED_USER_COUNT } from '../lib/config.ts';
import { loginAsSeedUser, userNumberForVu } from '../lib/auth.ts';
import { buildOptions } from '../lib/options.ts';

export const options: Options = buildOptions({
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
});

let popularUserId: number | undefined;

function ensureReady(userNumber: number): void {
  if (popularUserId) {
    return;
  }
  loginAsSeedUser(userNumber);
  const res = http.get(`${BASE_URL}/api/users?q=${POPULAR_USERNAME}`, {
    tags: { name: 'GET /api/users (setup)' },
  });
  const users: Array<{ id: number; username: string }> = JSON.parse(res.body as string).users;
  popularUserId = users.find((u) => u.username === POPULAR_USERNAME)?.id;
}

export default function (): void {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  ensureReady(userNumber);
  if (!popularUserId) {
    // perf-tests/seed/seed.sql未投入などでユーザーが見つからない場合はスキップする
    return;
  }

  // seed.sqlは人気ユーザーに499人のフォロワーを作るため、無ページネーション設計の
  // 挙動（レスポンスサイズ・クエリ時間）を確認できる
  const res = http.get(`${BASE_URL}/api/users/${popularUserId}/followers`, {
    tags: { name: 'GET /followers' },
  });
  check(res, { 'followers: status is 200': (r) => r.status === 200 });
}
