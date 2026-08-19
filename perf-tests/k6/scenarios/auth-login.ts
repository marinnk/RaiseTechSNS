// ログイン（POST /api/auth/login）の負荷試験。
// bcryptによるパスワード検証コストが応答時間にどう影響するかを確認する。
import { sleep } from 'k6';
import type { Options } from 'k6/options';

import { SEED_USER_COUNT } from '../lib/config.ts';
import { performLogin, userNumberForVu } from '../lib/auth.ts';
import { buildOptions } from '../lib/options.ts';

export const options: Options = buildOptions({
  // bcryptの検証コストがあるため、他の読み取り系エンドポイントよりやや緩めに設定
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
});

export default function (): void {
  const userNumber = userNumberForVu(SEED_USER_COUNT);
  // このシナリオはログイン自体の負荷を測るのが目的のため、他シナリオと違い
  // getAuthHeaders（1VUにつき1回だけ実行）ではなく、毎イテレーション実際にログインする
  performLogin(userNumber);

  sleep(1);
}
