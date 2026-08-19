import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL, SEED_USER_PASSWORD, seedEmail } from './config.ts';

/**
 * seed.sqlで投入したダミーユーザー（perf_user_0001〜perf_user_0500）として、
 * 毎回実際にログインリクエストを送る。auth-login.tsのようにログイン自体の
 * 負荷を測りたいシナリオで使う（他のシナリオは代わりに`getAuthHeaders`を使う）。
 * 戻り値の型はhttp.postの戻り値型（RefinedResponse）をそのまま推論に任せる。
 */
export function performLogin(userNumber: number) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: seedEmail(userNumber), password: SEED_USER_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/login' } },
  );
  check(res, { 'login: status is 200': (r) => r.status === 200 });
  return res;
}

let cachedAuthHeader: { Cookie: string } | undefined;

/**
 * ログイン済みユーザーとしてAPIを呼ぶためのCookieヘッダーを返す。VUごとに一度だけ
 * 実際にログインし、以降は結果をキャッシュして使い回す。
 *
 * 【重要】k6（少なくともインストール済みのv2.2.0で動作確認した限り）は、
 * ドキュメント上「per-VUのCookie jarはイテレーションをまたいで持続する」と
 * されているが、実際には次のイテレーション開始時にjarが空になりCookieが
 * 一切送られなくなる現象を確認した（1VU・複数イテレーションの最小構成でも
 * 再現し、2回目以降のリクエストが全て401になった）。そのため自動送信の
 * jarには頼らず、ログイン時のSet-CookieからaccessTokenの値だけを明示的に
 * 取り出し、呼び出し側が全リクエストの`headers`に付与する方式にしている。
 */
export function getAuthHeaders(userNumber: number): { Cookie: string } {
  if (!cachedAuthHeader) {
    const res = performLogin(userNumber);
    const token = extractCookieValue(res.headers['Set-Cookie'], 'access_token');
    cachedAuthHeader = { Cookie: token ? `access_token=${token}` : '' };
  }
  return cachedAuthHeader;
}

function extractCookieValue(setCookieHeader: string | undefined, name: string): string | undefined {
  if (!setCookieHeader) {
    return undefined;
  }
  // Set-Cookieが複数（access_token・refresh_token）ある場合、k6は","区切りで1つの
  // 文字列に結合するが、Expires属性の値自体に","が含まれるため単純に","分割できない。
  // トークン値はbase64url文字（英数字・-_.）のみのため、";"か","の手前までを
  // 値として取り出せば安全に抽出できる。
  const match = setCookieHeader.match(new RegExp(`${name}=([^;,]+)`));
  return match?.[1];
}

/**
 * VUごとに1〜seedUserCountの範囲で異なるユーザー番号を割り当てる。
 * 同じVUは実行中ずっと同じユーザーとしてログインする。
 */
export function userNumberForVu(seedUserCount: number): number {
  return ((__VU - 1) % seedUserCount) + 1;
}
