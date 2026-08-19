## perf-tests

RaiseTechSNSのパフォーマンステスト一式。**開発者が任意のタイミングで手動実行するもの**であり、
`./gradlew check`・`npm run test`・`npm run lint`のいずれにも組み込まれていない（CI自体も未整備）。

`docs/basic-design.md`の非機能要件は「受講生・個人の学習利用を前提とし、大量アクセス・大量データは
考慮しない」としているため、ここでの目的は本番並みの負荷への耐性証明ではなく、以下のような
設計上の判断が実際にどう振る舞うかを手元で確認できるようにすること。

- タイムライン（`GET /api/posts`）は全ログインユーザーが30秒間隔でポーリングする設計
- フォロワー一覧（`GET /api/users/{userId}/followers` / `following`）は意図的に無ページネーション
- ユーザー検索は索引なしの`LIKE`検索

### 2つのトラック

- **[k6/](k6/)** — バックエンドAPIの負荷試験。同時アクセス数を上げてサーバー・DBの挙動を見る
- **[frontend/](frontend/)** — フロントエンド画面のLighthouse監査。単一ユーザーがページを開いたときの
  読み込み・描画品質（Core Web Vitals等）を見る

測定対象も手法も異なるため、混同しないこと。

### 事前準備（共通）

1. `.claude/skills/run-app/SKILL.md`の手順でbackend（8080）・frontend（5173）・DB（5432）を起動する
2. `perf-tests/seed/seed.sql`を一度投入する（詳細は[seed/README.md](seed/README.md)参照）

### バックエンドAPI負荷試験（k6）の実行

[k6](https://k6.io/)のインストールが必要（例：`brew install k6`）。

```sh
# load（既定）: 20VUまでランプアップし2分間維持する
k6 run perf-tests/k6/scenarios/timeline-read.js

# smoke: 1VU・1イテレーションのみ。シナリオ自体が壊れていないかの確認用
k6 run -e MODE=smoke perf-tests/k6/scenarios/timeline-read.js

# ローカル以外の環境に対して実行する場合
k6 run -e BASE_URL=https://example.com perf-tests/k6/scenarios/timeline-read.js
```

用意しているシナリオ（[k6/scenarios/](k6/scenarios/)）：

- `timeline-read.js` — `GET /api/posts`（タイムライン。ポーリング＋無限スクロール想定、最優先）
- `auth-login.js` — `POST /api/auth/login`（bcryptコストの影響確認）
- `post-create.js` — `POST /api/posts`（投稿作成、テキストのみ）
- `likes-comments.js` — いいね登録/解除・コメント作成（高頻度な操作系）
- `profile-read.js` — `GET /api/users/{userId}`（フォロー数の相関サブクエリ集計）
- `followers-list.js` — `GET /api/users/{userId}/followers`（無ページネーションの弱点確認）

各シナリオの`thresholds`（p95応答時間・エラー率）はあくまで目安値。非機能要件が緩いプロジェクトである点を踏まえ、
厳密なSLAとしてではなく「劣化に気づくための基準」として扱うこと。

### フロントエンド画面性能監査（Lighthouse）の実行

```sh
./perf-tests/frontend/run.sh
```

詳細・制約（このアプリはURLルーティングを持たない単一画面SPAのため、監査対象はタイムライン画面のみ）は
[frontend/lighthouse.config.cjs](frontend/lighthouse.config.cjs)のコメントを参照。

`FRONTEND_URL`未指定の場合`npm run dev`（Viteの開発サーバー、5173番）を対象にするため、本番ビルドより
スコアが大きく悪化して見える点に注意（未バンドル・未最適化のモジュールを都度配信するため）。本番相当の数値が
必要な場合は`npm run build && npm run preview`（既定4173番）で起動し、
`FRONTEND_URL=http://localhost:4173 ./perf-tests/frontend/run.sh`のように実行すること。

### 結果の出力先

`perf-tests/results/`（Git管理対象外）に出力する。k6はデフォルトで標準出力にサマリーを表示するのみで
ファイルは残さないため、記録を残したい場合は`k6 run --out json=perf-tests/results/k6/<name>.json ...`のように
`--out`オプションを使うこと。
