-- comments.post_id・likes.post_id の外部キーにON DELETE CASCADEを追加する。
--
-- コメント機能・いいね機能の実装により、コメント・いいねが付いた投稿を削除しようとすると
-- FK制約違反で失敗する不具合が実際に起こり得るようになった（V1時点ではcomments/likesに
-- 実データが入らず顕在化していなかった）。投稿削除時は、その投稿に紐づくコメント・いいねも
-- 意味を持たなくなるため、DB側でカスケード削除する方針とする。
--
-- 制約名はV1でCONSTRAINT句を明示していないため、PostgreSQLのデフォルト命名規則
-- （<table>_<column>_fkey）に基づく（\d comments・\d likesで実際に確認済み）。
--
-- comments.user_id・likes.user_id側のFKにはCASCADEを付けない。ユーザー削除機能自体が
-- 存在しないため今回のスコープ外。

ALTER TABLE comments DROP CONSTRAINT comments_post_id_fkey;
ALTER TABLE comments
    ADD CONSTRAINT comments_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE;

ALTER TABLE likes DROP CONSTRAINT likes_post_id_fkey;
ALTER TABLE likes
    ADD CONSTRAINT likes_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE;
