## e2e/seed

Playwright E2Eテストが自己登録したダミーユーザー（`e2e_`プレフィックス）を削除するSQLスクリプト。

`perf-tests/seed`と異なり、e2eテストは事前投入されたシードデータに依存しない（各テストが
`POST /api/auth/register`で自分専用のユーザーを都度作成する。[../README.md](../README.md)参照）。
このスクリプトは、蓄積したそれらのユーザーを一括削除するためのものであり、テストの実行そのものには
不要（未実行でもテストは通る）。

### 注意事項

- ローカルの使い捨てDB専用。共有環境・本番相当の環境では絶対に実行しないこと
- 自動実行はされない。`e2e/run.sh`は実行後にこのスクリプトの存在をリマインドするのみで、
  勝手には実行しない（DBを直接操作する破壊的操作のため）

### いつ実行するか

- しばらくE2Eを実行し続けてDBに`e2e_%`ユーザーが溜まってきたと感じたとき
- タイムライン等を手動確認していて`e2e_`投稿がノイズになってきたとき

### 実行方法

```sh
psql "postgresql://raisetechsns:raisetechsns@localhost:5432/raisetechsns" -f e2e/seed/cleanup.sql
```

Dockerコンテナ経由で実行する場合：

```sh
docker exec -i raisetechsns-db psql -v ON_ERROR_STOP=1 -U raisetechsns -d raisetechsns < e2e/seed/cleanup.sql
```
