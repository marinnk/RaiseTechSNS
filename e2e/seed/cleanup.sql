-- e2e/テスト（Playwright）が自己登録したダミーユーザー（e2e_プレフィックス）を削除する。
--
-- 【重要】ローカルの使い捨てDB専用。共有環境・本番相当の環境では絶対に実行しないこと。
-- perf-tests/seed/seed.sqlと異なり、事前に決まった件数を「削除して再投入」するのではなく、
-- 各テスト実行が自己登録した不定数のe2e_%ユーザーを純粋に削除するだけ（再投入は行わない）。
--
-- 実行例（docker-compose.ymlの既定値の場合）:
--   psql "postgresql://raisetechsns:raisetechsns@localhost:5432/raisetechsns" -f e2e/seed/cleanup.sql
--
-- LIKEパターンはperf-tests/seed/seed.sqlの`perf_user_%`と同じ書き方（アンダースコアを
-- エスケープしない）に揃えている。「_」はLIKEの1文字ワイルドカードだが、実際のユーザー名は
-- 常に`e2e_<timestamp>_<random>`という形（4文字目が実際にアンダースコア）のため、
-- ワイルドカードとして解釈されても実データには一致する。他の利用者名が偶然
-- `e2eX...`（Xは任意の1文字）の形になっていない限り誤爆はしない。
--
-- FK制約の都合上、必ずこの順序で削除すること（perf-tests/seed/seed.sqlのコメント参照。
-- refresh_tokens・followsはON DELETE CASCADEが無いため、先に明示的に削除しないと
-- 外部キー制約違反になる。posts→comments/likes/post_imagesはON DELETE CASCADEで連鎖する
-- ため明示的な削除は不要。db/migration/V4, V5参照）:
--   1. refresh_tokens（user_idで）
--   2. follows（follower_id・followee_idの両方で）
--   3. posts（user_idで。CASCADEでcomments/likes/post_imagesも道連れに消える）
--   4. users

BEGIN;

DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%');
DELETE FROM follows
WHERE follower_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%')
   OR followee_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%');
DELETE FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'e2e_%');
DELETE FROM users WHERE username LIKE 'e2e_%';

COMMIT;

-- 削除結果の確認用（0件になっていればOK）
SELECT count(*) AS remaining_e2e_users FROM users WHERE username LIKE 'e2e_%';
