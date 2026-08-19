// タイムライン取得（GET /api/posts）の負荷試験。
//
// 実際のフロントエンドは全ログインユーザーが30秒間隔でこのエンドポイントを
// ポーリングする設計（docs/basic-design.md 1.8）のため、最優先で用意するシナリオ。
import http from 'k6/http';
import { check, sleep } from 'k6';
import type { Options } from 'k6/options';

import { BASE_URL, SEED_USER_COUNT } from '../lib/config.ts';
import { loginAsSeedUser, userNumberForVu } from '../lib/auth.ts';
import { buildOptions } from '../lib/options.ts';

export const options: Options = buildOptions({
  http_req_duration: ['p(95)<300'],
  http_req_failed: ['rate<0.01'],
});

let loggedIn = false;

export default function (): void {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  if (!loggedIn) {
    loginAsSeedUser(userNumber);
    loggedIn = true;
  }

  const res = http.get(`${BASE_URL}/api/posts?scope=all&limit=20`, {
    tags: { name: 'GET /api/posts' },
  });
  check(res, {
    'timeline: status is 200': (r) => r.status === 200,
    'timeline: has posts array': (r) => Array.isArray(JSON.parse(r.body as string).posts),
  });

  sleep(1);
}
