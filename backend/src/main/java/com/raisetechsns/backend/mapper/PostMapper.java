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
     * 投稿者情報付きの投稿一覧を{@code id}の降順（新しい順）で取得する。無限スクロールでの
     * 初回表示・追加読み込みに使う。
     *
     * @param limit 取得件数の上限
     * @param beforeId 指定するとこのidより古い（idが小さい）投稿を取得する。nullなら最新の投稿から取得する
     * @param currentUserId ログイン中の利用者のid。各投稿をいいね済みかどうか（{@code likedByMe}）の判定に使う
     * @param targetUserId 指定するとこの利用者の投稿のみに絞り込む（プロフィール画面の投稿一覧用）。nullなら絞り込まない
     * @param followingOnly trueなら、ログイン中の利用者がフォロー中の利用者（および自分自身）の投稿のみに絞り込む
     *     （タイムラインの「フォロー中」タブ用）
     */
    List<PostWithAuthor> findAllWithAuthor(
            @Param("limit") int limit, @Param("beforeId") Long beforeId, @Param("currentUserId") Long currentUserId,
            @Param("targetUserId") Long targetUserId, @Param("followingOnly") boolean followingOnly);

    /**
     * 投稿者情報付きの投稿一覧を{@code id}の昇順（古い順）で、指定したidより新しいものだけ取得する。
     * ポーリングでの新着差分取得専用。降順でlimit件に打ち切ると、1回のポーリング間隔でlimit件を超える
     * 投稿があった場合に間に挟まれた投稿を永久に取りこぼすため、あえて昇順（古い方から）にlimit件だけ
     * 取得することで、次回以降のポーリングで取りこぼし無く続きを取得できるようにしている。
     *
     * @param afterId このidより新しい（idが大きい）投稿を取得する
     * @param limit 取得件数の上限
     * @param currentUserId ログイン中の利用者のid。各投稿をいいね済みかどうか（{@code likedByMe}）の判定に使う
     * @param targetUserId 指定するとこの利用者の投稿のみに絞り込む（プロフィール画面の投稿一覧用）。nullなら絞り込まない
     * @param followingOnly trueなら、ログイン中の利用者がフォロー中の利用者（および自分自身）の投稿のみに絞り込む
     *     （タイムラインの「フォロー中」タブ用）
     */
    List<PostWithAuthor> findNewerWithAuthor(
            @Param("afterId") Long afterId, @Param("limit") int limit, @Param("currentUserId") Long currentUserId,
            @Param("targetUserId") Long targetUserId, @Param("followingOnly") boolean followingOnly);

    Optional<PostWithAuthor> findByIdWithAuthor(@Param("id") Long id, @Param("currentUserId") Long currentUserId);

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
