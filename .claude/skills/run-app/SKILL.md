---
name: run-app
description: Start the backend (Spring Boot) and frontend (Vite) dev servers for local verification. Use whenever you need to run/launch/preview the app, take a screenshot, or manually confirm a change works end-to-end.
---

# アプリの起動手順

このプロジェクトを実際に動かして確認するときは、必ずこの手順に従うこと。

## 前提: ポートは固定。競合したら「別ポートで動かす」のは禁止

- バックエンド（Spring Boot）: 必ず **8080**
- フロントエンド（Vite）: 必ず **5173**
- DB（PostgreSQL / Docker）: 必ず **5432**

Spring Bootはポートが使用中だと起動に失敗する。Viteはポートが使用中だと**黙って**5174などの別ポートに自動で切り替わって起動してしまう。どちらの場合も「動いていればOK」ではなく、**指定ポートで動いていることを毎回確認する**こと。別ポートで起動した状態のまま作業を進めない（フロントエンドの`VITE_API_BASE_URL`は`http://localhost:8080`固定なので、バックエンドが別ポートだと接続できず、逆にフロントエンドが別ポートだとCORS設定（`http://localhost:5173`のみ許可）に弾かれる）。

## 起動前: ポート競合の確認・解消

起動する前に、対象ポートを使っているプロセスがないか確認し、あれば停止する。

```sh
# 例: 8080番ポートを使っているプロセスを止める
lsof -ti:8080 -sTCP:LISTEN | xargs -r kill

# 例: 5173番ポートを使っているプロセスを止める
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

`rm`はこのプロジェクトの`.claude/settings.json`で禁止されているのと同様、`kill -9`も禁止されている。まずは通常の`kill`（SIGTERM）で止め、それでも残る場合はユーザーに相談する。

## 起動手順

```sh
# 1. DB（初回 or 停止している場合のみ）
docker compose up -d db

# 2. バックエンド（別ターミナル/バックグラウンド）
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew bootRun

# 3. フロントエンド（別ターミナル/バックグラウンド）
cd frontend
npm run dev
```

## 起動後の確認

```sh
# バックエンドが8080で応答しているか
curl -s http://localhost:8080/api/health

# フロントエンドが5173で応答しているか
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
```

いずれかが期待するポートで応答しない場合は、そのポートを使っている別プロセスがいないか再度`lsof`で確認し、止めてから起動し直す。「一時的に別のポートで動かして確認する」という代替策は取らない（アプリ側の設定が固定ポート前提のため、別ポートでは正しく動作しない）。

## バックエンドの統合テストとDBの関係

`AbstractIntegrationTest`（`backend/src/test/java/com/raisetechsns/backend/support/`）を継承した`@SpringBootTest`系テスト（Controllerテスト・Mapperテスト等）は、`docker-compose.yml`の`db`サービス（開発用DB）には接続しない。テスト実行のたびにTestcontainersが使い捨てのPostgreSQLコンテナを自動起動し、そこにFlywayマイグレーションを適用して使うため、`./gradlew test`・`./gradlew check`の前に`docker compose up -d db`を実行しておく必要は無い。開発用DBが起動していてもいなくても、これらのテストの結果もその中身も一切変わらない。

ただし、Testcontainersがコンテナを起動するためDockerデーモン自体は引き続き必須。また、`AbstractIntegrationTest`を継承し忘れた新しい`@SpringBootTest`は自動的にはこの恩恵を受けられず、`application.properties`の設定に従って開発用DBへ接続してしまう点に注意（コンパイル・単体実行では気づきにくいので、DB接続が要る新しいテストクラスを追加するときは必ず継承すること）。

## サンドボックス環境等でDockerが使えない場合

Docker daemonが起動していない環境（`docker compose up` が `dial unix .../docker.sock: connect: no such file or directory` で失敗する）では、DBに依存する`bootRun`・統合テスト（Testcontainersを使うテストを含む）は実行できない。その場合は以下に限定して確認し、DBが必要な検証はユーザー側の環境で行ってもらう。

```sh
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew compileJava checkstyleMain checkstyleTest compileTestJava --no-daemon
```

## ブラウザでの見た目確認（任意）

`chromium-cli`が使えない場合、`playwright-core` + ローカルのGoogle Chromeで代替できる:

```sh
npm install playwright-core   # スクラッチディレクトリ等、一時的な場所で
```

```js
const { chromium } = require('playwright-core');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
```
