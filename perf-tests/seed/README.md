## perf-tests/seed

k6負荷試験・Lighthouse監査で使うダミーデータを投入するSQLスクリプト。

### 注意事項

- **ローカルの使い捨てDB専用。** 共有環境・本番相当の環境では絶対に実行しないこと
- パスワードが固定（`Passw0rd!`）のダミーアカウントを大量に作成するため、開発用DB以外に投入しない
- 既存の`perf_user_%`データを削除してから再投入するため、複数回実行しても件数は増え続けない（[timeline-read.ts](../k6/scenarios/timeline-read.ts)などが作った投稿もリセットされる）

### 実行方法

`docker-compose.yml`の既定値（DB名・ユーザー名・パスワードいずれも`raisetechsns`、ポート5432）の場合：

```sh
psql "postgresql://raisetechsns:raisetechsns@localhost:5432/raisetechsns" -f perf-tests/seed/seed.sql
```

`docker-compose up -d`でDBを起動した状態で実行すること（手順は`.claude/skills/run-app/SKILL.md`参照）。

### 投入されるデータ

- ユーザー500件（`perf_user_0001`〜`perf_user_0500`、パスワードは全員`Passw0rd!`）
- 投稿：1ユーザーあたり20件（合計1万件）、直近30日にランダムな作成日時
- フォロー：各ユーザーが直後10人をフォロー（ベースとなる社会グラフ）に加え、
  `perf_user_0001`には残り499人全員をフォロワーとして付与（無ページネーションの
  フォロワー一覧エンドポイントの挙動を確認するため）
- いいね：投稿ごとに0〜29人がランダムにいいね
- コメント：投稿ごとに0〜4人がランダムにコメント

実行後、最後のSELECT文で投入件数を確認できる。
