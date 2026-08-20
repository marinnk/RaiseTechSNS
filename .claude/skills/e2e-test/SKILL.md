---
name: e2e-test
description: Run the Playwright E2E tests under e2e/ on demand — functional scenario tests (UC01–UC09 user flows from docs/functional-requirements.md; these also run automatically in CI on every PR/push to main) and browser performance/timing tests (login, post submission, infinite scroll, search latency; on-demand only, excluded from CI). Use whenever the user asks to run "E2Eテスト"/"E2Eテストを実行"/"Playwrightテスト"/an end-to-end or browser functional test, or asks to measure real-browser page/interaction timing (distinct from k6 load tests or Lighthouse audits under perf-tests/).
---

# E2Eテスト（Playwright）の実行手順

`e2e/`配下のPlaywrightテストを実行する手順。全体像・2トラックの違いは[e2e/README.md](../../../e2e/README.md)を参照。

**このスキルはユーザーから明示的に頼まれたときの手動実行用。** scenariosトラックは
[CI](../../../.github/workflows/ci.yml)でPR作成時・mainへのpush時にも自動実行されるが、
ローカルで単発に確認したい場合や特定specだけ回したい場合はこのスキルを使う。performanceトラックは
CI・`./gradlew check`・`npm run test`・`npm run lint`のいずれにも組み込まれておらず、常にオンデマンド
実行（[perf-test skill](../perf-test/SKILL.md)と同じ方針）。

## 0. どのトラックを実行するか判断する

ユーザーの依頼から以下を判断する。曖昧な場合は、まずscenariosを実行し、結果を見せた上で
performanceも実行するかをユーザーに確認する。

- 対象トラック：scenarios（機能シナリオ）／performance（画面・操作の時間計測）／両方
- 特定specの指定があれば、それだけを実行する（例：`auth-login.spec.ts`）

## 1. 前提環境を起動する

[run-app skill](../run-app/SKILL.md)の手順でbackend（8080）・frontend（5173）・DB（5432）を起動する。
プロフィール編集シナリオ（アイコン画像アップロード）を実行するならMinIOも
（`docker compose up -d`で一緒に起動する）。

```sh
curl -s http://localhost:8080/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
```

## 2. 初回のみ：Playwright本体のインストール

```sh
cd e2e
npm install
npx playwright install chromium
```

## 3. 実行する

```sh
./e2e/run.sh scenarios
./e2e/run.sh performance
./e2e/run.sh scenarios post-detail.spec.ts   # 特定specのみ
```

`run.sh`は実行前にbackend・frontendのヘルスチェックを行い、実行後は`e2e/results/<track>/`に
HTMLレポートを保存する（直近5件のみ保持）。

## 4. 結果を報告する

- **scenarios**：成功/失敗したspec名。失敗時はスクリーンショット・トレースのパス
  （`e2e/results/scenarios/scenarios-<timestamp>/index.html`。`npx playwright show-trace`で
  トレースを開ける旨も伝える）
- **performance**：各journeyの実測ms・しきい値・超過の有無
  （`e2e/results/performance/performance-<timestamp>.json`）。非機能要件が緩いプロジェクトである点を
  踏まえ、目安であってSLAではない旨を添える（`docs/basic-design.md`参照）

## 5. 後片付け

scenarios/performanceいずれも、各テストが`e2e_`プレフィックス付きのダミーユーザーを自己登録するため、
実行するたびにDBへ蓄積する。**ユーザーに確認した上で**、以下のクリーンアップスクリプトの実行を提案する
（無断では実行しない。DBを直接操作する破壊的操作のため）。

```sh
docker exec -i raisetechsns-db psql -v ON_ERROR_STOP=1 -U raisetechsns -d raisetechsns < e2e/seed/cleanup.sql
```

詳細は[e2e/seed/README.md](../../../e2e/seed/README.md)参照。

サーバーの停止については[run-app skill](../run-app/SKILL.md)参照（ユーザーが引き続き動作確認等で
使う様子なら、勝手に止めずに確認する）。
