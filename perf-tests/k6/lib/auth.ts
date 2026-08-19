import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL, SEED_USER_PASSWORD, seedEmail } from './config.ts';

/**
 * seed.sqlで投入したダミーユーザー（perf_user_0001〜perf_user_0500）としてログインする。
 *
 * k6はVUごとに独立したJS実行環境とCookieの保存領域を持つため、ここでログインしておけば
 * 同じVU内であれば以降のリクエストで認証Cookie（access_token・refresh_token）が
 * 自動的に送信される（明示的なCookie受け渡しは不要）。
 *
 * 戻り値の型はhttp.postの戻り値型（RefinedResponse）をそのまま推論に任せる
 * （k6のTypeScript型定義は具体的なジェネリック引数の指定が煩雑なため）。
 */
export function loginAsSeedUser(userNumber: number) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: seedEmail(userNumber), password: SEED_USER_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/login' } },
  );
  check(res, { 'login: status is 200': (r) => r.status === 200 });
  return res;
}

/**
 * VUごとに1〜seedUserCountの範囲で異なるユーザー番号を割り当てる。
 * 同じVUは実行中ずっと同じユーザーとしてログインする。
 */
export function userNumberForVu(seedUserCount: number): number {
  return ((__VU - 1) % seedUserCount) + 1;
}
