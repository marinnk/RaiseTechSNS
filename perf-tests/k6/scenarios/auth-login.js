// ログイン（POST /api/auth/login）の負荷試験。
// bcryptによるパスワード検証コストが応答時間にどう影響するかを確認する。
import { SEED_USER_COUNT } from '../lib/config.js';
import { loginAsSeedUser, userNumberForVu } from '../lib/auth.js';
import { buildOptions } from '../lib/options.js';

export const options = buildOptions({
  // bcryptの検証コストがあるため、他の読み取り系エンドポイントよりやや緩めに設定
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
});

export default function () {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  loginAsSeedUser(userNumber);
}
