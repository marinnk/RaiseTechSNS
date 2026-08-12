package com.raisetechsns.backend.mapper;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.PostWithAuthor;

/**
 * {@code posts}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/PostMapper.xml}に書く。
 */
@Mapper
public interface PostMapper {

    /**
     * 投稿者情報付きの投稿一覧を{@code id}の降順（新しい順）で取得する。
     *
     * <p>{@code beforeId}・{@code afterId}はどちらか一方のみ指定できる（同時指定はService層で弾く）。
     * どちらもnullなら最新の投稿から取得する。
     *
     * @param limit 取得件数の上限
     * @param beforeId 指定するとこのidより古い（idが小さい）投稿を取得する（無限スクロールでの追加読み込み用）
     * @param afterId 指定するとこのidより新しい（idが大きい）投稿を取得する（ポーリングでの新着差分取得用）
     */
    List<PostWithAuthor> findAllWithAuthor(
            @Param("limit") int limit, @Param("beforeId") Long beforeId, @Param("afterId") Long afterId);

    Optional<PostWithAuthor> findByIdWithAuthor(@Param("id") Long id);

    Optional<Post> findById(@Param("id") Long id);

    /**
     * 新規投稿を1件登録する。実行すると、DBで採番されたIDが{@code post}に反映される。
     */
    void insert(Post post);

    /**
     * 投稿本文を更新する。{@code userId}も条件に含めることで、他人の投稿を誤って更新しない防御にしている
     * （所有者チェックの本体はService層で行う）。
     *
     * @return 更新できた件数（0なら対象が存在しないか他人の投稿）
     */
    int update(@Param("id") Long id, @Param("userId") Long userId, @Param("content") String content);

    /**
     * 投稿を削除する。{@code userId}も条件に含める理由は{@link #update}と同じ。
     *
     * @return 削除できた件数（0なら対象が存在しないか他人の投稿）
     */
    int delete(@Param("id") Long id, @Param("userId") Long userId);
}
