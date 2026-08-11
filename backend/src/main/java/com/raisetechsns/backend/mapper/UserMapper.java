package com.raisetechsns.backend.mapper;

import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.User;

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
}
