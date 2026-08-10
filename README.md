# RaiseTechSNS

X（旧Twitter）のタイムライン形式を模したSNS風Webアプリケーション（学習用）。

## 概要

受講生・個人が学習目的で利用することを想定した、複数ユーザー対応のSNS風アプリです。ログイン・タイムライン・コメント・いいね・画像投稿・フォローの各機能を備えつつ、インプレッション数表示やリツイート機能は持たない点がX（Twitter）との違いです。

詳細な仕様は[要件定義書](docs/requirements.md)を参照してください。

## 使用技術

姉妹プロジェクト[TaskManagement](../TaskManagement)と同一の技術スタックを採用しています。

- バックエンド：Java 25 / Spring Boot 4.1.0 / Spring Data JPA / Gradle
- フロントエンド：TypeScript / React 19 / Vite
- データベース：PostgreSQL 16

バージョンの詳細は[基本設計書](docs/basic-design.md)を参照してください。

## プロジェクト構成

```
.
├── backend/    # Spring Boot（REST API、Dockerfile含む）
├── frontend/   # React + Vite（画面、Dockerfile・nginx.conf含む）
├── docs/       # 要件定義・設計ドキュメント
└── docker-compose.yml  # PostgreSQL起動用
```

## ステータス

現在、ヘルスチェックAPI・DBスキーマ（Flywayマイグレーション）までのスキャフォールドが済んでいます。ログイン・タイムライン等の各機能はこれから実装します。

## セットアップ

### PostgreSQL（Docker）の起動

前提: Docker / Docker Compose が必要です。

```sh
docker compose up -d
```

デフォルトでは `localhost:5432` にDB名 `raisetechsns`、ユーザー/パスワード `raisetechsns` で起動します（`.env.example` を参考に `.env` を作成すると値を変更できます）。

### バックエンド（Spring Boot）

前提: Java 25 が必要です（Homebrewの場合 `brew install openjdk@25`）。上記のPostgreSQLコンテナを先に起動してください。

```sh
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew bootRun
```

起動後、`http://localhost:8080/api/health` にアクセスすると `{"status":"ok"}` が返ります。

DB接続先はデフォルトでDocker Composeの設定と一致していますが、環境変数（`DB_HOST` / `DB_PORT` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`）で上書きできます。

### フロントエンド（React + Vite）

前提: Node.js が必要です。上記のバックエンドを先に起動してください。

```sh
cd frontend
npm install
npm run dev
```

起動後、`http://localhost:5173` にアクセスするとバックエンドAPIとの接続状況が表示されます。APIの接続先はデフォルトで `http://localhost:8080` です（`frontend/.env.example` を参考に `.env.development` を上書きすると変更できます）。

## テスト

```sh
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew test
```

フロントエンドは以下でLint・自動テストを実行できます。

```sh
cd frontend
npm run lint
npm run test
```

## 関連ドキュメント

- [要件定義書](docs/requirements.md)  
  概要・目的・スコープ・関連ドキュメントへのリンク集
- [機能要件](docs/functional-requirements.md)  
  提供する機能一覧とユースケース
- [画面設計](docs/screen-design.md)  
  画面一覧とワイヤーフレーム
- [基本設計書](docs/basic-design.md)  
  技術スタック・システム構成・データベース設計（ER図）・非機能要件

## 開発フロー

Issueを起票 → Issueに対応するブランチを作成 → PRを作成してmainにマージ、という流れで開発します。mainブランチへの直接pushは禁止されています。詳細は[CLAUDE.md](CLAUDE.md)を参照してください。
