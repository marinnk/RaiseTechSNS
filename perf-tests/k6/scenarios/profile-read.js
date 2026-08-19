// プロフィール取得（GET /api/users/{userId}）の負荷試験。
// フォロワー数・フォロー数は相関サブクエリで集計しているため、
// フォロワー数が多いユーザー（seed.sqlで作る「人気ユーザー」）を対象にする。
import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL, POPULAR_USERNAME, SEED_USER_COUNT } from '../lib/config.js';
import { loginAsSeedUser, userNumberForVu } from '../lib/auth.js';
import { buildOptions } from '../lib/options.js';

export const options = buildOptions({
  http_req_duration: ['p(95)<300'],
  http_req_failed: ['rate<0.01'],
});

let popularUserId;

function ensureReady(userNumber) {
  if (popularUserId) {
    return;
  }
  loginAsSeedUser(userNumber);
  const res = http.get(`${BASE_URL}/api/users?q=${POPULAR_USERNAME}`, {
    tags: { name: 'GET /api/users (setup)' },
  });
  const users = JSON.parse(res.body).users;
  popularUserId = users.find((u) => u.username === POPULAR_USERNAME)?.id;
}

export default function () {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  ensureReady(userNumber);
  if (!popularUserId) {
    // perf-tests/seed/seed.sql未投入などでユーザーが見つからない場合はスキップする
    return;
  }

  const res = http.get(`${BASE_URL}/api/users/${popularUserId}`, {
    tags: { name: 'GET /api/users/{id}' },
  });
  check(res, { 'profile: status is 200': (r) => r.status === 200 });
}
