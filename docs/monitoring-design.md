# 監視設計書：RaiseTechSNS（仮称）

[← 基本設計書に戻る](basic-design.md)

## 改訂履歴

**1.0 / 2026-08-14**  
初版作成。バックエンド（Spring Boot）のみを対象に、構造化ログ・リクエスト相関ID・ログベースの監視方針を整備した。インフラ未構築のため、DataDog等の監視SaaSは今回導入せず、将来導入する際にそのまま活用できる形でログ基盤のみ先行整備する

**1.1 / 2026-08-14**  
コードレビューで判明した問題を修正。`RequestLoggingFilter`がTomcatの内部的なエラー転送（ERRORディスパッチ）を素通りしてしまい、その転送中に設定された`userId`がMDCから消えずスレッドプール再利用時に別リクエストへ漏れる恐れがあったため、ERRORディスパッチも対象に含めるよう修正。あわせて`X-Request-Id`レスポンスヘッダーがCORSの`exposedHeaders`未設定によりフロントエンドから読めていなかった点を修正し、MDCキー名（`requestId`・`userId`）を`MdcKeys`定数クラスに集約した

## 1. 目的・スコープ

- 目的：障害発生時の原因調査を早めること、および将来DataDog等の監視SaaSを導入する際に構成変更を最小限にすること
- スコープ：バックエンド（Spring Boot）のみを対象とする。フロントエンド（React）・インフラ（DB、コンテナ実行環境等）の監視方針は本書の対象外とし、8章の要検討リストに送る
- 前提：本書執筆時点でDataDog等の監視SaaSは未導入。本書は「今回何を実装したか」と「将来ツールを導入する際の指針」の両方を記載する

## 2. ログ設計

### 出力形式

- 標準出力にのみ出力する（ファイル出力は行わない）。将来コンテナ運用に移行した際、DataDog Agent等がコンテナの標準出力を収集する運用を前提としている
- 環境変数`LOG_FORMAT`で出力形式を切り替える（`backend/src/main/resources/logback-spring.xml`）
  - 未設定 または `plain`（デフォルト）：人間可読なコンソール出力。ローカル開発（`./gradlew bootRun`）で使う
  - `json`：構造化（JSON）ログ出力。`net.logstash.logback:logstash-logback-encoder`を使用する。本番相当の環境では`LOG_FORMAT=json`を設定する想定
- 既存の`JWT_COOKIE_SECURE`・`SPRINGDOC_ENABLED`と同様、「開発は素の状態、本番相当は環境変数で切替」という本プロジェクトの既存方針に合わせている

### JSONログのフィールド

`LOG_FORMAT=json`の場合、1行のログは以下のフィールドを持つJSONになる。

- `@timestamp`：発生日時
- `level`：ログレベル（ERROR/WARN/INFO/DEBUG）
- `logger_name`：ログを出力したクラス名
- `message`：ログメッセージ
- `stack_trace`：例外発生時のスタックトレース
- `service`：サービス名（環境変数`DD_SERVICE`、未設定時`raisetechsns-backend`）
- `env`：環境名（環境変数`DD_ENV`、未設定時`local`）
- `requestId`：リクエスト相関ID（3章を参照）
- `userId`：ログイン中の利用者ID（認証済みリクエストのみ）

`service`・`env`は、DataDogのUnified Service Tagging（`DD_SERVICE`・`DD_ENV`・`DD_VERSION`）という標準的な属性名に合わせてある。将来dd-trace-java（DataDog公式のJavaエージェント）を導入する際、同名の環境変数を設定するだけでログとAPMトレースの`service`・`env`が揃う。

### ログレベルの使い分け方針

- ERROR：サーバー側の問題・想定外の例外。人が対応すべきもの
  - 例：`GlobalExceptionHandler.handleUnexpectedException`の`LOG.error("unexpected error occurred", ex)`
- WARN：異常だが処理は継続できるもの
  - 例：`RefreshTokenService`の`LOG.warn("revoked refresh token reused, revoking all sessions: userId={}", ...)`（失効済みリフレッシュトークンの再利用を検知した際の警告）
- INFO：業務上意味のあるイベント
  - 例：`AuthService`の`LOG.info("user registered: id={}", ...)`・`LOG.info("user logged in: id={}", ...)`、`PostService`の`LOG.info("post created: id={}, userId={}, images={}", ...)`
- DEBUG：開発時の詳細情報。本番相当の環境では出力しない（`logback-spring.xml`のルートロガーは`INFO`）

バリデーションエラー（400番台）はERRORにしない。ユーザー入力ミス等、想定内の失敗であり、人が都度対応すべきものではないため（`GlobalExceptionHandler`の400/404/415系ハンドラーは実際にログを出していない）。

### ログに含めてはいけない情報

- JWTアクセストークン・リフレッシュトークン（生値・ハッシュ値とも）
- Cookie（`access_token`・`refresh_token`）の値そのもの
- パスワード（生の値・ハッシュ値とも）
- `Authorization`・`Set-Cookie`ヘッダーの値

現状のコードは既にこの方針を守れている。

- `RefreshTokenService`は、リフレッシュトークンの生値をログに出さず、`userId`のみを出す
- `JwtAuthenticationFilter`は、無効なトークンを検知してもログを出さず（例外を握りつぶしそのまま未認証として処理を続ける）、トークンの値自体がログに載る経路が存在しない
- リクエストボディ・ヘッダーを丸ごとログに出すフィルター（`CommonsRequestLoggingFilter`等）は導入していない。今後導入する場合は、`password`・`Cookie`・`Authorization`をマスキングする設定を必ず入れること

### 今後ログを書く際の指針

- 既存コードと同じ`"何が起きたか key1={} key2={}", value1, value2`という形式に統一する（メッセージに項目名を埋め込む書き方。特別なライブラリAPIを使わなくても、JSON化した際の`message`フィールドがそのまま検索可能な文字列になる）
- 個別のフィールドとしてDataDog上でファセット化・集計したい要件が具体的に出てきた場合は、`net.logstash.logback.argument.StructuredArguments.kv(key, value)`を使った構造化引数への切り替えを検討する（今回は導入しない。8章の要検討リストを参照）

## 3. リクエスト相関ID（requestId）

- 目的：1つのHTTPリクエストに関わる全ログ行（複数のクラスにまたがることもある）を後から1つに束ねて追えるようにする
- 実装：`com.raisetechsns.backend.logging.RequestLoggingFilter`
  - リクエストごとに`UUID.randomUUID()`でリクエストIDを発行し、MDC（`org.slf4j.MDC`）に`requestId`として設定する
  - レスポンスヘッダー`X-Request-Id`にも同じ値を返す（フロントエンドでの手動確認・問い合わせ対応時の突き合わせに使う）
  - リクエスト完了時（`finally`）に「リクエスト完了ログ」を1行出力する：`request completed method=... path=... status=... durationMs=...`
  - 同じ`finally`でMDCをクリアする（Tomcatのスレッドプール再利用時に前のリクエストの情報が次のリクエストに漏れないようにするため）
  - クライアントから送られてきた`X-Request-Id`ヘッダーがあっても信頼せず、必ずサーバー側で新規に生成する（将来リバースプロキシ配下に置く際に見直す）
- 実行順序：`com.raisetechsns.backend.logging.LoggingConfig`で`FilterRegistrationBean`を使い`Ordered.HIGHEST_PRECEDENCE`として明示登録している。これにより、Spring Securityのフィルターチェーン（`order=-100`）より前段で全リクエストを包み、認証エラー（401）等セキュリティ層で完結するレスポンスにも`requestId`が付与される
- ディスパッチ種別：Servletフィルターのデフォルト（`REQUEST`のみ）に加えて`ERROR`ディスパッチも対象にしている。Spring Securityのフィルターチェーンはデフォルトで`ERROR`ディスパッチ（Tomcatが例外発生時に行うエラーページへの内部転送）でも動くため、ここを揃えないと、その転送中に`JwtAuthenticationFilter`が設定した`userId`をこのフィルターがクリアできず、スレッドプール再利用時に次の無関係なリクエストのログへ漏れてしまう
- 認証済みリクエストには、`JwtAuthenticationFilter`が追加で`userId`もMDCに設定する。MDCのキー名（`requestId`・`userId`）は`com.raisetechsns.backend.logging.MdcKeys`に定数として集約している
- フロントエンドから`X-Request-Id`ヘッダーを読めるよう、`SecurityConfig`のCORS設定で`exposedHeaders`に指定している（ブラウザはデフォルトでは非公開ヘッダーを隠すため）
- 将来dd-trace-javaを導入すると、`dd.trace_id`・`dd.span_id`が自動でMDCに注入されるようになる。その際も本書の`requestId`（アプリケーション層のリクエスト単位の相関ID）と`dd.trace_id`（分散トレーシング全体の相関ID）は役割が異なるため、両方をあわせて残す方針とする

## 4. 監視すべき指標（バックエンドのみ・ログベース）

- 現状、`spring-boot-starter-actuator`・Micrometer等のメトリクス収集の仕組みは未導入
- そのため当面は、3章の「リクエスト完了ログ」1行が、Rate・Errors・Duration（いわゆるRED指標）を把握する唯一の情報源になる
  - Rate：単位時間あたりの`request completed`ログの件数
  - Errors：`status`が5xx（または4xx）の件数の割合
  - Duration：`durationMs`の値（遅いエンドポイントの特定に使う）
- 確認方法（開発時）：`LOG_FORMAT=json`で起動し、`| jq 'select(.message | startswith("request completed"))'`のようにフィルタして確認する
- 将来の拡張方針：`spring-boot-starter-actuator`＋`micrometer-registry-datadog`を導入し、ログのパースに頼らない正式なメトリクス収集（レスポンスタイムのパーセンタイル、JVMメトリクス、DBコネクションプールの使用率等）に移行する

## 5. 平常時の運用ルール

- 現状アラートツールは未導入のため、異常検知は以下の手動運用にとどめる
  - アプリを起動・動作確認するたびに、コンソールのログを目視する
  - `GET /api/health`のヘルスチェックを、起動確認・動作確認の起点にする（`.claude/skills/run-app/SKILL.md`の起動手順でも使用している）
- 将来アラートツール（DataDog Monitors等）を導入した際に通知対象とする指標は、4章のRate・Errors・Durationを基本とする
  - 通知の重要度は「今すぐ対応すべきもの（エラー率の急増等）」と「参考情報（閾値に近づいている等）」を分け、通知先を分ける方針とする（現状は導入していないため詳細は8章の要検討リストへ）

## 6. 障害対応フロー（Runbook）

- 検知：現状は5章の手動確認が起点。将来はアラート通知が起点になる
- 初動対応の基本手順
  1. 発生時刻・影響範囲を特定する（特定の利用者のみで起きているか、全体で起きているか）
  2. 該当する`requestId`（レスポンスヘッダー`X-Request-Id`、またはログの`request completed`行）でログを絞り込み、一連の処理を追跡する
  3. `GlobalExceptionHandler.handleUnexpectedException`が出す`unexpected error occurred`のERRORログとスタックトレースを確認し、例外の種類を特定する
- 典型的な障害パターンと切り分けの初動チェックリスト
  - 500エラーの急増：スタックトレースの例外クラスから、DB接続（コネクションプール枯渇等）の問題か、S3等の外部サービス呼び出し失敗かを判別する
  - 401/403の急増：`jwt.secret`・トークン有効期限の設定変更、または`JWT_COOKIE_SECURE`等Cookie属性の環境変数設定ミスを疑う
  - レスポンスタイムの悪化：「リクエスト完了ログ」の`durationMs`が大きいエンドポイントを特定し、N+1クエリ等を疑う（`docs/basic-design.md`のAPI設計に記載のN+1対策が実際に効いているかの裏取りにもなる）
- 復旧後の振り返り：恒久対応が必要な場合は、新しい仕組みを増やさず、本プロジェクト既存のIssue駆動開発フロー（`CLAUDE.md`）に沿ってIssueを起票し対応する
- エスカレーション体制：個人開発の現状、オンコール等の体制は不要と判断する。チーム運用に発展した場合の検討事項として8章の要検討リストに送る

## 7. 将来のDataDog導入ステップ

本書で整備したログ基盤（JSON化・`service`/`env`・`requestId`）は、以下の手順でそのままDataDog導入に活用できる想定である。

1. DataDog Agentをコンテナに追加し、標準出力のログを収集する
2. dd-trace-java（DataDog公式Javaエージェント）を導入し、`DD_SERVICE`・`DD_ENV`・`DD_VERSION`環境変数を設定する（本書の`service`/`env`と同じ命名のため、追加の設定変更は不要）
3. DataDog Logs PipelineでJSONログをパースし、`service`・`env`・`requestId`・`userId`をファセット化する。あわせてSensitive Data Scannerで機微情報のマスキングルールを設定する
4. `spring-boot-starter-actuator`＋`micrometer-registry-datadog`を導入し、正式なメトリクス収集に移行する（4章参照）
5. RED指標（Rate・Errors・Duration）を基準にDataDog Monitorsでアラートを作成する
6. 6章の障害対応フローを、DataDogのダッシュボード・アラート通知を前提にした内容に更新する

## 8. 要検討リスト

- フロントエンド（React）の監視方針（RUM等）
- インフラ（DB、コンテナ実行環境等）の監視方針
- チーム運用に発展した場合のオンコール体制・エスカレーションフロー
- DataDog等の監視SaaSを実際に導入する時期・予算
- ログに個別のフィールドを持たせる要件が具体的に発生した場合の、`StructuredArguments.kv()`導入の検討
- 非同期コントローラー（`@Async`・`DeferredResult`等）を将来追加する場合の`RequestLoggingFilter`の対応（現状はASYNCディスパッチ未対応。MDCがリクエスト完了時と別スレッドに残ったままになる恐れがある）
