package com.raisetechsns.backend.mapper;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.Comment;
import com.raisetechsns.backend.entity.CommentWithAuthor;

/**
 * {@code comments}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/CommentMapper.xml}に書く。
 */
@Mapper
public interface CommentMapper {

    /**
     * 投稿者情報付きのコメント一覧を、指定した投稿について{@code id}の昇順（古い順）で取得する。
     * {@code posts}同様、{@code id}はAUTO_INCREMENTかつ挿入順と一致するため、
     * {@code created_at}ではなく{@code id}を使う。
     */
    List<CommentWithAuthor> findAllWithAuthorByPostId(@Param("postId") Long postId);

    Optional<CommentWithAuthor> findByIdWithAuthor(@Param("id") Long id);

    Optional<Comment> findById(@Param("id") Long id);

    /**
     * 新規コメントを1件登録する。実行すると、DBで採番されたIDが{@code comment}に反映される。
     */
    void insert(Comment comment);

    /**
     * コメントを削除する。{@code userId}も条件に含めることで、他人のコメントを誤って削除しない防御にしている
     * （所有者チェックの本体はService層で行う）。
     *
     * @return 削除できた件数（0なら対象が存在しないか他人のコメント）
     */
    int delete(@Param("id") Long id, @Param("userId") Long userId);
}
