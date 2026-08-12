-- postsの投稿日時（created_at・updated_at）をTIMESTAMPTZ（タイムゾーン付き）に変更する。
--
-- 変更前はTIMESTAMP（タイムゾーン情報なし）で保存していたため、バックエンドが返す日時文字列を
-- フロントエンドの`new Date(isoString)`がブラウザのローカルタイムゾーンとして解釈してしまい、
-- サーバーとブラウザが異なるタイムゾーンで動作する環境では投稿日時の表示がずれる可能性があった。
-- TIMESTAMPTZに変更し、UTCを正として保存することでこの問題を解消する。
--
-- 既存データはTIMESTAMP（タイムゾーン情報なし）で、UTCとして記録されていたものとみなして変換する。
ALTER TABLE posts
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
ALTER TABLE posts
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
