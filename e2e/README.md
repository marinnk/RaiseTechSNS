## e2e

RaiseTechSNSのE2Eテスト一式（Playwright）。**開発者が任意のタイミングで手動実行するもの**であり、
`./gradlew check`・`npm run test`・`npm run lint`のいずれにも組み込まれていない（CI自体も未整備。
[perf-tests/](../perf-tests/)と同じ扱い）。

### 2つのトラック

- **[scenarios/](scenarios/)** — 機能シナリオテスト。`docs/functional-requirements.md`のUC01〜UC09
  （会員登録・ログイン・投稿・いいね・コメント・フォロー・プロフィール編集・ユーザー検索）＋
  画面横断のハッピーパス・無限スクロール・画像バリデーションを実ブラウザで検証する
- **[performance/](performance/)** — ブラウザパフォーマンステスト。ログイン・投稿・無限スクロール・
  検索など、複数ステップにまたがる操作の体感時間（ms）を計測する

このアプリには`perf-tests/`（バックエンドAPI負荷試験のk6・タイムライン単体監査のLighthouse）が
既にあるが、測定対象がどちらとも異なる（[perf-tests/README.md](../perf-tests/README.md)の
「測定対象も手法も異なるため、混同しないこと」という方針を踏襲）。

- `perf-tests/k6/` — バックエンドAPIへの同時アクセス負荷（サーバー・DB側の挙動）
- `perf-tests/frontend/`（Lighthouse） — タイムライン単体ページの読み込み品質監査（Core Web Vitals）
- `e2e/performance/`（このディレクトリ） — 実ブラウザで1ユーザーが一連の操作をしたときの体感時間
  （クリック→通信→再描画までの合計時間）。上記2つでは測れない「投稿してから一覧に反映されるまで」
  「スクロールしてから追加投稿が表示されるまで」のような、複数ステップにまたがる操作の実測

### 事前準備

1. `.claude/skills/run-app/SKILL.md`の手順でbackend（8080）・frontend（5173）・DB（5432）を起動する。
   プロフィール編集シナリオ（アイコン画像アップロード）を実行するならMinIOも
   （`docker compose up -d`で一緒に起動する）
2. 初回のみ、Playwright本体（Chromiumのみ）をインストールする

   ```sh
   cd e2e
   npm install
   npx playwright install chromium
   ```

### テストデータ戦略

各テスト（またはfixture）が`POST /api/auth/register`で`e2e_<timestamp>_<random>`という
ユニークなユーザー名を都度自前登録する（[support/api.ts](support/api.ts)・
[support/fixtures.ts](support/fixtures.ts)参照）。`perf-tests/seed`のような固定シードには
依存しない。

このため、テストを実行するたびにDBへ`e2e_`ユーザーが蓄積する。不要になったら
[seed/cleanup.sql](seed/README.md)で一括削除できる（自動実行はされない。破壊的操作のため）。

### scenariosの実行

```sh
./e2e/run.sh scenarios
./e2e/run.sh scenarios auth-login.spec.ts   # 特定specのみ
```

内部で`backend`・`frontend`のヘルスチェックを行ってから`playwright test --project=scenarios`を
実行する。ヘルスチェックを省いて素早く回したい場合（実装中の反復実行等）は、`e2e`配下で
`npm run test:scenarios`を直接使ってもよい。

### performanceの実行

```sh
./e2e/run.sh performance
```

`e2e/results/performance/performance-<timestamp>.json`に、計測した各操作（journey）の実測ms・
しきい値・超過の有無が出力される。しきい値は`perf-tests`と同じく**「劣化に気づくための目安」で
あり厳密なSLAではない**（`docs/basic-design.md`の非機能要件が学習用途規模を前提としているため）。
[performance/](performance/)配下の各specに書かれた初期しきい値は実装時点の暫定値のため、
一度実行して得られる実測値をもとに調整すること。

`npm run dev`（未バンドルのVite開発サーバー）に対する計測は、Lighthouseと同様に本番ビルドより
悪化して見える。本番相当の数値が必要な場合は次のように実行する。

```sh
cd frontend && npm run build && npm run preview   # 4173番で起動
E2E_BASE_URL=http://localhost:4173 ./e2e/run.sh performance
```

### レポート

`e2e/results/`（Git管理対象外）に出力する。直近5件のみ保持し、古いものは`run.sh`が自動削除する
（`perf-tests/k6/run.sh`と同じローテーション方式）。

- `e2e/results/scenarios/scenarios-<timestamp>/index.html` — PlaywrightのHTMLレポート
  （失敗時のスクリーンショット・トレースを含む）
- `e2e/results/performance/performance-<timestamp>.json` — 計測結果のサマリー
- `e2e/results/performance/performance-<timestamp>/index.html` — その回のHTMLレポート

`e2e`配下で`npm run report`を実行すると、直近の実行結果（`playwright-report/`）をブラウザで開ける。

### 後片付け

`./e2e/run.sh`は実行のたびに、蓄積した`e2e_`ユーザーの削除方法を案内するのみで、自動では削除しない。
[seed/README.md](seed/README.md)を参照。

検証のためだけに起動したサーバーは、作業終了時に停止する（`.claude/skills/run-app/SKILL.md`参照）。

### 既知の制約

- **URLルーティングが無い単一画面SPA**（`frontend/src/App.tsx`・`TimelineScreen.tsx`のview state方式）
  のため、すべてのテストは`/`から始めて画面遷移をクリックで辿る。特定画面への直接遷移（deep link）はできない
- **タイムラインの30秒間隔ポーリング（新着投稿バナー）はテスト対象外**。1テストあたり30秒以上を
  要し、日常的に回すE2Eスイートには見合わないため、意図的に除外している。必要になれば、バックエンドの
  ポーリング間隔を環境変数化してテスト時だけ短縮する等の対応を別Issueで検討する
- `data-testid`は一切使わない。フロントエンドの既存Vitest+RTLテストと同じく、`getByRole`/
  `getByLabelText`等の日本語文言でのアクセシブルロケーターを使う（[support/selectors.ts](support/selectors.ts)参照）
- 対象外（機能要件で明示的にスコープ外）：おすすめユーザー・非公開アカウント・ブロック機能・
  投稿全文検索
