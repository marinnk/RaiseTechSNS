// perf-tests全体で共有する設定値。
// BASE_URLは環境変数で切り替えられるようにする（既定はローカルのバックエンド）。
//   例: k6 run -e BASE_URL=http://localhost:8080 perf-tests/k6/scenarios/timeline-read.js
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// perf-tests/seed/seed.sqlで投入するダミーユーザーの範囲・共通パスワード。
// 詳細はperf-tests/seed/README.mdを参照。
export const SEED_USER_COUNT = 500;
export const SEED_USER_PASSWORD = 'Passw0rd!';

// seed.sqlで大量のフォロワーを持たせる「人気ユーザー」。
// フォロワー一覧（無ページネーション）・プロフィール（フォロワー数集計）の負荷試験対象。
export const POPULAR_USERNAME = 'perf_user_0001';

export function seedUsername(n) {
  return `perf_user_${String(n).padStart(4, '0')}`;
}

export function seedEmail(n) {
  return `${seedUsername(n)}@example.com`;
}
