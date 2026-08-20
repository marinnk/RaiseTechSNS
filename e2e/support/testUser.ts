// e2e/テストが自前登録するダミーユーザーに関する共通定義。
//
// perf-tests/seed（固定件数のperf_user_%を事前投入）とは異なり、e2eテストは各テストが
// 都度POST /api/auth/registerで自分専用のユーザーを作る。DBに溜まったこれらのユーザーは
// `e2e_`プレフィックスで判別できるようにし、e2e/seed/cleanup.sqlで一括削除できるようにする。

export interface TestUser {
  id: number;
  username: string;
  email: string;
  password: string;
  displayName: string;
}

// e2e_<timestamp>_<random>形式。同時に複数テストが並列実行されても衝突しないよう、
// タイムスタンプ＋ランダム文字列を組み合わせる。
export function randomE2eUsername(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `e2e_${ts}_${rand}`;
}
