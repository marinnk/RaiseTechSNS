package com.raisetechsns.backend.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * {@code likes}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/LikeMapper.xml}に書く。
 *
 * <p>いいね数・いいね済みかどうかの読み出しは常に{@link PostMapper}の相関サブクエリ経由で
 * 行うため、{@code likes}の1行を表すエンティティ・読み出し用メソッドはここには置かない。
 */
@Mapper
public interface LikeMapper {

    /**
     * 指定した投稿に、指定した利用者としていいねする。既にいいね済みなら何もしない
     * （{@code likes}の{@code UNIQUE(post_id, user_id)}制約に対して{@code ON CONFLICT DO NOTHING}）。
     * 同じ投稿への連打・二重送信でもエラーにならないよう、冪等な操作にしている。
     */
    void insertIgnoreConflict(@Param("postId") Long postId, @Param("userId") Long userId);

    /**
     * 指定した投稿への、指定した利用者によるいいねを取り消す。
     *
     * @return 削除できた件数（いいねしていなければ0。呼び出し側はこれをエラーにしない＝冪等）
     */
    int delete(@Param("postId") Long postId, @Param("userId") Long userId);
}
