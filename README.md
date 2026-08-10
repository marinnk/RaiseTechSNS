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
├── docs/   # 要件定義・設計ドキュメント
└── （backend/・frontend/ は実装着手時に追加予定）
```

## ステータス

現在はドキュメント（要件定義・機能要件・画面設計・基本設計）の整備段階で、実装には未着手です。

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
