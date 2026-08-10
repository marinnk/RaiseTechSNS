---
name: quality-check
description: Run a comprehensive code-quality review of the RaiseTechSNS app (Spring Boot backend + React/Vite frontend) — automated lint/test/build/checkstyle checks plus a deeper architectural review comparing the implementation against docs/ and README.md, common React/Spring Boot anti-patterns, and JWT authentication/authorization concerns. Use whenever the user asks for a "品質チェック"/"quality check"/"code review" of the whole app, wants to know if the codebase has drifted from best practices or from the requirements docs, or asks to check the app before a release/milestone. Do not use this for routine per-PR verification — CI already covers that; this skill is for the periodic, deeper review.
---

# 品質チェック

このアプリ（Spring Bootバックエンド + React/Viteフロントエンド）の品質を、自動チェックと設計レベルのレビューの2段階で確認する手順。

## この手順を使うタイミング

CIが毎回のpush・PRで自動的にlint/test/checkstyleを実行している場合、**このスキル全体を毎回のPRごとに実行する必要はない**。以下のようなタイミングで使う。

- まとまった機能追加が一段落したとき
- 個人開発・学習プロジェクトのペースなら1〜2ヶ月に1回程度
- 「なんとなくコードが雑然としてきた」と感じたとき
- リリースや大きな区切りの前

## 第1段階：自動チェック（毎回同じ、機械的に実行）

```sh
# フロントエンド
cd frontend
npm run lint
npm run test
npm run build
```

```sh
# バックエンド（test + Checkstyle）
cd backend
export JAVA_HOME=/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home
./gradlew check
```

`./gradlew check`はDB（PostgreSQL）への接続を必要とするテストを含む。Docker daemonが起動していない環境では、`docker compose up -d db`を先に実行するか、DB非依存の`./gradlew compileJava checkstyleMain checkstyleTest compileTestJava`のみに限定して確認する。

### ローカル特有の注意：DBの蓄積データによる見せかけの失敗

バックエンドの統合テストは、Docker上のPostgreSQLに投入されたシードデータの件数・内容を前提にすることがある。ローカルのDBコンテナを長期間起動しっぱなしにしていると、過去の手動確認やテスト実行で追加・削除したデータが蓄積し、前提とズレて、**コードには問題がないのにテストが失敗する**ことがある。

テストが失敗したら、まずこれが原因でないか疑い、DBをリセットしてから再実行して切り分ける。

```sh
docker compose down -v
docker compose up -d db
```

リセット後も同じ箇所で失敗する場合のみ、実際のコードの問題として扱う。

## 第2段階：設計・アーキテクチャレベルのレビュー（自動化できない部分）

### ドキュメントとの整合性

`docs/`（requirements.md・functional-requirements.md・screen-design.md・basic-design.md）と`README.md`の内容が、実際の実装と食い違っていないか確認する。

- READMEの「ステータス」節が実装済み機能を正しく反映しているか
- `docs/basic-design.md`のテーブル定義・制約（users・posts・post_images・comments・likes・follows）が、実際のEntity（`@Column`の`length`/`nullable`等）やFlywayのマイグレーション（`backend/src/main/resources/db/migration/`）と一致しているか
- `docs/functional-requirements.md`の機能一覧（F-1〜F-6）に対して、未実装の機能がREADMEで「実装済み」と誤って書かれていないか
- タイムラインの「全体」「フォロー中」の2種類の表示が、画面設計通りに区別して実装されているか

### フロントエンドのチェック観点

- アクセシビリティ：`frontend/.oxlintrc.json`に`jsx-a11y`相当のルールが有効化されているか。モーダルを使う画面（投稿フォーム等）に`role="dialog"`・フォーカストラップ・Escapeキーでの閉じる操作があるか
- 責務分離：コンポーネントがデータ取得・状態管理・画面表示を1ファイルに詰め込んでいないか（API通信・データ更新ロジックはカスタムフックに分離されているべき）
- 認証状態の扱い：JWTトークンの保存場所（XSS対策）、未ログイン時のリダイレクト、トークン期限切れ時の挙動が一貫しているか
- ミューテーション後の無駄な全件再取得：投稿・いいね・コメント・フォローのたびに、APIレスポンスを使わず画面全体のデータを取り直していないか
- 未使用のアセット・importが残っていないか

### バックエンドのチェック観点

- 入力バリデーション：新しいAPIのリクエストDTOに`@Valid`・`@NotBlank`・`@Size`等のBean Validationアノテーションが付いているか（投稿本文280文字、画像最大4枚等の制約が実装に反映されているか）
- 認証・認可：JWTの検証がSpring Securityのフィルターチェーンで一貫して行われているか。「自分の投稿/コメントだけ削除できる」「未ログインでは投稿・いいね・コメント・フォローできない」といった認可ルールが、個々のController/Serviceで場当たり的に実装されていないか
- 例外処理：例外パターンが`GlobalExceptionHandler`（`@RestControllerAdvice`）で一貫して処理されるか
- N+1クエリ：投稿一覧のいいね数・コメント数集計や、フォロー中タイムラインの絞り込みで、ループしながら1件ずつリポジトリへ問い合わせるコードが増えていないか
- スキーマ管理：DBのテーブル定義変更が、`ddl-auto`任せではなく`backend/src/main/resources/db/migration/`配下の新しいバージョン番号のマイグレーションファイルとして追加されているか
- レイヤリング：コンストラクタインジェクション・DTOによるレスポンス分離・薄いコントローラー（業務ロジックはサービス層に）が維持されているか

## レポートのまとめ方

第1段階（自動チェック）の結果と、第2段階（観点ごとの気づき）を分けて報告する。第2段階は「問題」と決めつけず、「気になった点」として提示し、対応するかどうか・どの粒度で進めるか（Issueを分けるか、まとめるか）はユーザーに確認してから着手する。CLAUDE.mdのIssue駆動開発フローに従い、実際にコードを直す場合は必ずIssue→ブランチ→PRの手順を踏む。
