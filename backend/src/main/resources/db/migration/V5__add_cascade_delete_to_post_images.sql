-- post_images.post_id の外部キーにON DELETE CASCADEを追加する。
--
-- V4でcomments.post_id・likes.post_idに対して行ったのと同じ理由。投稿を削除しようとすると
-- post_imagesがあるとFK制約違反で失敗してしまうため、投稿削除時はDB側でカスケード削除する
-- 方針とする（投稿画像のS3上の実ファイルは、アプリ側（PostService.delete）で投稿削除前に
-- URLを取得しておき、削除後にコミット後削除する）。
--
-- 制約名はV1でCONSTRAINT句を明示していないため、PostgreSQLのデフォルト命名規則
-- （<table>_<column>_fkey）に基づく。

ALTER TABLE post_images DROP CONSTRAINT post_images_post_id_fkey;
ALTER TABLE post_images
    ADD CONSTRAINT post_images_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE;
