-- perf-tests用のダミーデータ投入スクリプト。
--
-- 【重要】ローカルの使い捨てDB専用。共有環境・本番相当の環境では絶対に実行しないこと。
-- 詳細な注意事項はperf-tests/seed/README.mdを参照。
--
-- 実行例（docker-compose.ymlの既定値の場合）:
--   psql "postgresql://raisetechsns:raisetechsns@localhost:5432/raisetechsns" -f perf-tests/seed/seed.sql
--
-- 冪等性: username LIKE 'perf_user_%' に該当する既存データを削除してから再投入するため、
-- 複数回実行しても件数が際限なく増え続けることはない
-- （perf-tests/k6/scenarios/post-create.jsが実行のたびに追加する投稿もここでリセットされる）。

BEGIN;

-- 既存の投入データを削除。likes・comments・post_imagesはpost_idにON DELETE CASCADEが
-- 設定されているため、postsを削除すれば連鎖的に消える（db/migration/V4, V5参照）。
-- refresh_tokensはuser_idにON DELETE CASCADEが無いため、先に明示的に削除しておかないと
-- 「ログイン済みのperf_user_%」をDELETEしようとしたときに外部キー制約違反になる
-- （k6シナリオ・perf-tests/frontend/run.shはいずれもログイン時にrefresh_tokenを発行するため、
-- 一度でもテストを実行した後の再投入で必ず該当する）。
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');
DELETE FROM follows
WHERE follower_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%')
   OR followee_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');
DELETE FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%');
DELETE FROM users WHERE username LIKE 'perf_user_%';

-- ユーザー: perf_user_0001〜perf_user_0500（全員パスワードは"Passw0rd!"）
-- password_hashは"Passw0rd!"をBCrypt（strength 10）でハッシュ化した固定値
INSERT INTO users (username, email, password_hash, display_name, bio)
SELECT
    'perf_user_' || lpad(n::text, 4, '0'),
    'perf_user_' || lpad(n::text, 4, '0') || '@example.com',
    '$2y$10$DOwzcZ6suNeHIleUtYBG8uYnD.9Vfi4CAKEVhI2aiFjVGpM5EVubS',
    'Perf User ' || lpad(n::text, 4, '0'),
    'perf-testsのk6負荷試験用に投入したダミーアカウント'
FROM generate_series(1, 500) AS n;

-- 投稿: 1ユーザーあたり20件、直近30日にばらけて作成（カーソルページネーション・
-- created_at DESCソートの挙動を確認できる程度のボリュームを確保する）
INSERT INTO posts (user_id, content, created_at, updated_at)
SELECT
    u.id,
    'perf test post #' || p.n || ' by ' || u.username,
    now() - (random() * interval '30 days'),
    now() - (random() * interval '30 days')
FROM users u
CROSS JOIN generate_series(1, 20) AS p(n)
WHERE u.username LIKE 'perf_user_%';

-- フォロー: 各ユーザーが自分の次から10人をフォロー（wrap-around）し、ベースとなる社会グラフを作る
INSERT INTO follows (follower_id, followee_id)
SELECT
    follower.id,
    followee.id
FROM users follower
JOIN generate_series(1, 10) AS offset_n ON true
JOIN users followee
    ON followee.username = 'perf_user_'
        || lpad((((substring(follower.username FROM 11)::int + offset_n - 1) % 500) + 1)::text, 4, '0')
WHERE follower.username LIKE 'perf_user_%'
  AND followee.id <> follower.id
ON CONFLICT DO NOTHING;

-- perf_user_0001に他の全ユーザーをフォロワーとして付け、「人気ユーザー」にする。
-- follows.followers/followingは意図的に無ページネーション実装のため、この規模のデータで
-- レスポンスサイズ・クエリ時間の挙動を確認する（perf-tests/k6/scenarios/followers-list.js）
INSERT INTO follows (follower_id, followee_id)
SELECT u.id, (SELECT id FROM users WHERE username = 'perf_user_0001')
FROM users u
WHERE u.username LIKE 'perf_user_%' AND u.username <> 'perf_user_0001'
ON CONFLICT DO NOTHING;

-- いいね: 投稿ごとに0〜29人がランダムにいいね
INSERT INTO likes (post_id, user_id)
SELECT p.id, liker.id
FROM posts p
JOIN LATERAL (
    SELECT id
    FROM users
    WHERE username LIKE 'perf_user_%'
    ORDER BY random()
    LIMIT (random() * 30)::int
) AS liker ON true
WHERE p.content LIKE 'perf test post #%';

-- コメント: 投稿ごとに0〜4人がランダムにコメント
INSERT INTO comments (post_id, user_id, content)
SELECT p.id, commenter.id, 'perf test comment by ' || commenter.username
FROM posts p
JOIN LATERAL (
    SELECT id, username
    FROM users
    WHERE username LIKE 'perf_user_%'
    ORDER BY random()
    LIMIT (random() * 5)::int
) AS commenter ON true
WHERE p.content LIKE 'perf test post #%';

COMMIT;

-- 投入結果の確認用（任意）
SELECT
    (SELECT count(*) FROM users WHERE username LIKE 'perf_user_%') AS users,
    (SELECT count(*) FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%')) AS posts,
    (SELECT count(*) FROM follows WHERE followee_id = (SELECT id FROM users WHERE username = 'perf_user_0001'))
        AS popular_user_followers,
    (SELECT count(*) FROM likes WHERE post_id IN (
        SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%')
    )) AS likes,
    (SELECT count(*) FROM comments WHERE post_id IN (
        SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'perf_user_%')
    )) AS comments;
