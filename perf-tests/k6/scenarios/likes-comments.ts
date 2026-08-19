// いいね・コメント（POST/DELETE /likes, POST /comments）の負荷試験。
// タイムライン上で最も高頻度に呼ばれる操作系エンドポイント群をまとめて対象にする。
import http from 'k6/http';
import { check, sleep } from 'k6';
import type { Options } from 'k6/options';

import { BASE_URL, SEED_USER_COUNT } from '../lib/config.ts';
import { getAuthHeaders, userNumberForVu } from '../lib/auth.ts';
import { buildOptions } from '../lib/options.ts';
import { safeJsonParse } from '../lib/json.ts';

export const options: Options = buildOptions({
  http_req_duration: ['p(95)<300'],
  http_req_failed: ['rate<0.01'],
});

let postIds: number[] = [];

function ensureReady(userNumber: number, headers: { Cookie: string }): void {
  if (postIds.length > 0) {
    return;
  }
  const res = http.get(`${BASE_URL}/api/posts?scope=all&limit=50`, {
    headers,
    tags: { name: 'GET /api/posts (setup)' },
  });
  // レスポンスが不正でも例外を投げず、単に取得できなかった扱いにする
  // （例外を投げると後続のsleep()が実行されず、VUが待機なしで暴走する。詳細はlib/json.ts参照）
  postIds = safeJsonParse<{ posts: Array<{ id: number }> }>(res.body)?.posts.map((p) => p.id) ?? [];
}

export default function (): void {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  const headers = getAuthHeaders(userNumber);
  ensureReady(userNumber, headers);
  if (postIds.length === 0) {
    // perf-tests/seed/seed.sql未投入などで投稿が無い場合はスキップする
    return;
  }
  const postId = postIds[Math.floor(Math.random() * postIds.length)];

  const likeRes = http.post(`${BASE_URL}/api/posts/${postId}/likes`, null, {
    headers,
    tags: { name: 'POST /likes' },
  });
  check(likeRes, { 'like: status is 2xx': (r) => r.status >= 200 && r.status < 300 });

  const commentRes = http.post(
    `${BASE_URL}/api/posts/${postId}/comments`,
    JSON.stringify({ content: `k6 load test comment ${Date.now()}` }),
    { headers: { ...headers, 'Content-Type': 'application/json' }, tags: { name: 'POST /comments' } },
  );
  check(commentRes, { 'comment: status is 201': (r) => r.status === 201 });

  // いいねは冪等な操作のため、最後に解除して次イテレーションの状態を揃える
  const unlikeRes = http.del(`${BASE_URL}/api/posts/${postId}/likes`, null, {
    headers,
    tags: { name: 'DELETE /likes' },
  });
  check(unlikeRes, { 'unlike: status is 2xx': (r) => r.status >= 200 && r.status < 300 });

  sleep(1);
}
