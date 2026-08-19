---
name: perf-test
description: Run the on-demand performance tests under perf-tests/ — k6 load tests against backend API endpoints (timeline, login, post creation, likes/comments, profile, followers list) and a Lighthouse audit of the frontend timeline screen. Use whenever the user asks to run a "パフォーマンステスト"/"負荷試験"/"performance test"/"load test", or asks to run k6 or Lighthouse against this app. These are never run automatically (not part of CI/./gradlew check/npm run test) — only when explicitly requested.
---

# パフォーマンステストの実行手順

`perf-tests/`配下のk6シナリオ（バックエンドAPI負荷試験）・Lighthouse監査（フロントエンド画面性能）を実行する手順。全体像・シナリオ一覧は[perf-tests/README.md](../../../perf-tests/README.md)を参照。

**これらは常にオンデマンド実行。** ユーザーから明示的に頼まれたときだけ実行し、`./gradlew check`・`npm run test`・`npm run lint`の一部として自動実行してはならない。

## 0. どのテストを実行するか判断する

ユーザーの依頼から以下を判断する。曖昧な場合はAskUserQuestion等で確認せず、**まずsmokeモードで全シナリオを実行し**、問題なければ結果を見せた上で「loadモードや個別シナリオも実行するか」をユーザーに確認する（負荷をかける実行はいきなり長時間・広範囲に行わない）。

- 対象トラック：バックエンド（k6）／フロントエンド（Lighthouse）／両方
- k6のモード：`smoke`（既定・数秒で終わる動作確認）／`load`（20VUまでランプアップし3分程度）
- 特定のシナリオ名の指定があれば、それだけを実行する（`timeline-read` / `auth-login` / `post-create` / `likes-comments` / `profile-read` / `followers-list`）

## 1. 前提環境を起動する

[run-app skill](../run-app/SKILL.md)の手順でbackend（8080）・DB（5432）を起動する。Lighthouseトラックも実行する場合はfrontend（5173）も起動する。k6のみなら不要。

```sh
docker compose up -d db
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew bootRun   # バックグラウンドで起動し、以降のコマンドは別途実行する
```

起動確認：

```sh
curl -s http://localhost:8080/api/health
```

## 2. シードデータを投入する（未投入の場合）

k6シナリオ・Lighthouseはいずれも`perf_user_0001`〜`perf_user_0500`（パスワード共通`Passw0rd!`）というダミーユーザーの存在を前提にする。未投入だとログインに失敗しシナリオが即座にスキップ/失敗するため、投入済みか確認し、無ければ投入する。

```sh
# 投入済みか確認（0件ならまだ投入されていない）
docker exec raisetechsns-db psql -U raisetechsns -d raisetechsns -tAc \
  "SELECT count(*) FROM users WHERE username LIKE 'perf_user_%'"

# 未投入なら投入する（ローカルの使い捨てDB専用。詳細はperf-tests/seed/README.md参照）
docker exec -i raisetechsns-db psql -v ON_ERROR_STOP=1 -U raisetechsns -d raisetechsns \
  < perf-tests/seed/seed.sql
```

## 3. k6（バックエンドAPI負荷試験）を実行する

`k6`コマンドが無ければ`brew install k6`でインストールする（`which k6`で確認）。

```sh
# 個別シナリオ（smoke=既定）
k6 run -e MODE=smoke perf-tests/k6/scenarios/timeline-read.ts

# loadモード（20VUまでランプアップし3分程度かかる）
k6 run perf-tests/k6/scenarios/timeline-read.ts

# 全シナリオをまとめてsmoke実行する場合
for s in timeline-read auth-login post-create likes-comments profile-read followers-list; do
  echo "=== $s ==="
  k6 run -e MODE=smoke "perf-tests/k6/scenarios/$s.ts"
done
```

結果は標準出力の`checks`（成功率100%が期待値）・`http_req_duration`（p95）・`http_req_failed`を見る。`thresholds`未達（`✗`表示）があれば、シナリオ名・エンドポイント・実測値をユーザーに報告する。

## 4. Lighthouse（フロントエンド画面性能監査）を実行する

frontend（5173）が起動していることを確認してから実行する。

```sh
./perf-tests/frontend/run.sh
```

結果は`perf-tests/results/lighthouse/<name>-<timestamp>.report.html`（ブラウザで開ける）と`.report.json`に出力される。JSONの`categories.performance.score`（0〜1）・`audits.largest-contentful-paint`等の主要指標をユーザーに報告する。古いレポートは`run.sh`が実行のたびに直近5件だけ残して自動削除するため、手動で消す必要はない。

`npm run dev`（Viteの開発サーバー）に対する数値は未バンドル・未最適化のため本番ビルドより大幅に悪く出る。本番相当の数値が要る場合は`cd frontend && npm run build && npm run preview`（既定4173番）を起動してから`FRONTEND_URL=http://localhost:4173 ./perf-tests/frontend/run.sh`を実行する。

## 5. 結果を報告する

- k6：シナリオごとにcheck成功率・p95応答時間・エラー率。thresholds未達があれば強調する
- Lighthouse：performanceスコア・主要Core Web Vitals（LCP・CLS・TBT）。レポートファイルのパスを伝える
- 非機能要件（`docs/basic-design.md`）は「学習用途・大量アクセス非考慮」前提のため、数値は厳密なSLA判定ではなく「劣化に気づくための目安」として扱う

## 6. 後片付け

### DBに残ったテストデータのリセット

`post-create.ts`（投稿を作成）・`likes-comments.ts`（コメントを作成）を実行すると、ダミーデータがDBに残ったままになる（自動では消えない）。放置すると、後で普通に手動確認したときに`k6 load test post ...`のようなダミー投稿がタイムラインに混ざったり、[quality-check skill](../quality-check/SKILL.md)が警告する「DBの蓄積データによる見せかけの失敗」を自ら引き起こしたりする。

そのため、k6シナリオ（特に`post-create.ts`・`likes-comments.ts`）を実行した後は、**ユーザーに確認した上で**`perf-tests/seed/seed.sql`を再実行してリセットすることを提案する。`perf_user_%`の投稿を全削除→再投入する処理のため、`ON DELETE CASCADE`でコメント・いいねも道連れに消え、元の状態に戻る（DBを直接操作する破壊的操作なので、無断では実行しない）。

```sh
docker exec -i raisetechsns-db psql -v ON_ERROR_STOP=1 -U raisetechsns -d raisetechsns \
  < perf-tests/seed/seed.sql
```

`timeline-read.ts`・`auth-login.ts`・`profile-read.ts`・`followers-list.ts`のみ実行した場合はデータを書き換えないため、このリセットは不要。

### サーバーの停止

検証のためだけに起動したサーバーは、作業終了時に停止する（[run-app skill](../run-app/SKILL.md)参照）。

```sh
lsof -ti:8080 -sTCP:LISTEN | xargs -r kill
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
docker compose down
```

ただし、ユーザーが引き続き動作確認等で使う様子なら、勝手に止めずに確認する。
