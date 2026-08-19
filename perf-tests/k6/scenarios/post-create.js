// 投稿作成（POST /api/posts）の負荷試験（テキストのみ、画像添付は対象外）。
//
// 注意: 実行するたびにDBへ投稿が追加され続ける。件数をリセットしたい場合は
// perf-tests/seed/seed.sqlを再実行すること（perf_user_%の投稿を削除してから再投入する）。
import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL, SEED_USER_COUNT } from '../lib/config.js';
import { loginAsSeedUser, userNumberForVu } from '../lib/auth.js';
import { buildOptions } from '../lib/options.js';
import { buildJsonOnlyMultipart } from '../lib/multipart.js';

export const options = buildOptions({
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
});

let loggedIn = false;

export default function () {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  if (!loggedIn) {
    loginAsSeedUser(userNumber);
    loggedIn = true;
  }

  const { body, headers } = buildJsonOnlyMultipart('data', {
    content: `k6 load test post ${Date.now()}-${__VU}-${__ITER}`,
  });

  const res = http.post(`${BASE_URL}/api/posts`, body, {
    headers,
    tags: { name: 'POST /api/posts' },
  });
  check(res, { 'post create: status is 201': (r) => r.status === 201 });
}
