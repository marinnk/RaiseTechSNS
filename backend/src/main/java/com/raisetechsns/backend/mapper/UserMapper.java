package com.raisetechsns.backend.mapper;

import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserWithStats;

/**
 * {@code users}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/UserMapper.xml}に書く。
 */
@Mapper
public interface UserMapper {

    Optional<User> findById(@Param("id") Long id);

    Optional<User> findByEmail(@Param("email") String email);

    boolean existsByEmail(@Param("email") String email);

    boolean existsByUsername(@Param("username") String username);

    /**
     * 新規会員を1件登録する。実行すると、DBで採番されたIDが{@code user}に反映される。
     */
    void insert(User user);

    /**
     * プロフィール画面用に、利用者1件をフォロワー数・フォロー中数・ログイン中利用者がフォロー済みか
     * どうかとあわせて取得する（{@link com.raisetechsns.backend.mapper.PostMapper#findByIdWithAuthor}と
     * 同じ相関サブクエリ・EXISTSの考え方）。
     *
     * @param currentUserId ログイン中の利用者のid。{@code followedByMe}の判定に使う
     */
    Optional<UserWithStats> findByIdWithStats(@Param("id") Long id, @Param("currentUserId") Long currentUserId);

    /**
     * 自己紹介を更新する。
     *
     * @return 更新できた件数（0なら対象が存在しない）
     */
    int updateBio(@Param("id") Long id, @Param("bio") String bio);
}
