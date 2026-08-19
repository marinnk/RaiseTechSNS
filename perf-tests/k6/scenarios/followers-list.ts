// フォロワー一覧取得（GET /api/users/{userId}/followers）の負荷試験。
//
// docs/basic-design.mdでは「学習用途規模のデータ量を前提」に、このエンドポイントは
// 意図的にページネーションを実装していない（安全のためのLIMITのみ）。フォロワー数が
// 増えるとレスポンスサイズ・クエリ時間がどう変化するか、意図的な設計上の弱点を確認する
// ためのシナリオ。
import http from 'k6/http';
import { check, sleep } from 'k6';
import type { Options } from 'k6/options';

import { BASE_URL, POPULAR_USERNAME, SEED_USER_COUNT } from '../lib/config.ts';
import { getAuthHeaders, userNumberForVu } from '../lib/auth.ts';
import { buildOptions } from '../lib/options.ts';
import { safeJsonParse } from '../lib/json.ts';

export const options: Options = buildOptions({
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
});

let popularUserId: number | undefined;

function ensureReady(headers: { Cookie: string }): void {
  if (popularUserId) {
    return;
  }
  const res = http.get(`${BASE_URL}/api/users?q=${POPULAR_USERNAME}`, {
    headers,
    tags: { name: 'GET /api/users (setup)' },
  });
  // レスポンスが不正でも例外を投げず、単に取得できなかった扱いにする
  // （例外を投げると後続のsleep()が実行されず、VUが待機なしで暴走する。詳細はlib/json.ts参照）
  const users = safeJsonParse<{ users: Array<{ id: number; username: string }> }>(res.body)?.users ?? [];
  popularUserId = users.find((u) => u.username === POPULAR_USERNAME)?.id;
}

export default function (): void {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  const headers = getAuthHeaders(userNumber);
  ensureReady(headers);
  if (!popularUserId) {
    // perf-tests/seed/seed.sql未投入などでユーザーが見つからない場合はスキップする
    return;
  }

  // seed.sqlは人気ユーザーに499人のフォロワーを作るため、無ページネーション設計の
  // 挙動（レスポンスサイズ・クエリ時間）を確認できる
  const res = http.get(`${BASE_URL}/api/users/${popularUserId}/followers`, {
    headers,
    tags: { name: 'GET /followers' },
  });
  check(res, { 'followers: status is 200': (r) => r.status === 200 });

  sleep(1);
}
