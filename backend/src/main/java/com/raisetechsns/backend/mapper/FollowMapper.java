package com.raisetechsns.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.UserFollowSummary;

/**
 * {@code follows}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/FollowMapper.xml}に書く。
 *
 * <p>フォロワー数・フォロー中数・フォロー済みかどうかの読み出しは常に{@link UserMapper}の
 * 相関サブクエリ経由で行うため、それらの集計用メソッドはここには置かない。
 */
@Mapper
public interface FollowMapper {

    /**
     * 指定した利用者を、指定した利用者がフォローする。既にフォロー済みなら何もしない
     * （{@code follows}の{@code UNIQUE(follower_id, followee_id)}制約に対して{@code ON CONFLICT DO NOTHING}）。
     * 連打・二重送信でもエラーにならないよう、冪等な操作にしている。
     */
    void insertIgnoreConflict(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    /**
     * フォローを解除する。
     *
     * @return 削除できた件数（フォローしていなければ0。呼び出し側はこれをエラーにしない＝冪等）
     */
    int delete(@Param("followerId") Long followerId, @Param("followeeId") Long followeeId);

    /**
     * 指定した利用者のフォロワー一覧を取得する。
     *
     * @param currentUserId ログイン中の利用者のid。一覧の各行の{@code followedByMe}の判定に使う
     */
    List<UserFollowSummary> findFollowers(@Param("userId") Long userId, @Param("currentUserId") Long currentUserId);

    /**
     * 指定した利用者がフォロー中の利用者一覧を取得する。
     *
     * @param currentUserId ログイン中の利用者のid。一覧の各行の{@code followedByMe}の判定に使う
     */
    List<UserFollowSummary> findFollowing(@Param("userId") Long userId, @Param("currentUserId") Long currentUserId);
}
