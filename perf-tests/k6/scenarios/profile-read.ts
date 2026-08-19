// プロフィール取得（GET /api/users/{userId}）の負荷試験。
// フォロワー数・フォロー数は相関サブクエリで集計しているため、
// フォロワー数が多いユーザー（seed.sqlで作る「人気ユーザー」）を対象にする。
import http from 'k6/http';
import { check, sleep } from 'k6';
import type { Options } from 'k6/options';

import { BASE_URL, POPULAR_USERNAME, SEED_USER_COUNT } from '../lib/config.ts';
import { getAuthHeaders, userNumberForVu } from '../lib/auth.ts';
import { buildOptions } from '../lib/options.ts';
import { safeJsonParse } from '../lib/json.ts';

export const options: Options = buildOptions({
  http_req_duration: ['p(95)<300'],
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

  const res = http.get(`${BASE_URL}/api/users/${popularUserId}`, {
    headers,
    tags: { name: 'GET /api/users/{id}' },
  });
  check(res, { 'profile: status is 200': (r) => r.status === 200 });

  sleep(1);
}
