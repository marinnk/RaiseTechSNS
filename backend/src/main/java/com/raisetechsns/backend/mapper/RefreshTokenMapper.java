package com.raisetechsns.backend.mapper;

import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.RefreshToken;

/**
 * {@code refresh_tokens}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/RefreshTokenMapper.xml}に書く。
 */
@Mapper
public interface RefreshTokenMapper {

    /**
     * 失効済み・期限切れかどうかに関わらず、ハッシュ値が一致する行を返す。
     * 有効性の判定は呼び出し側（サービス層）で行う。
     */
    Optional<RefreshToken> findByTokenHash(@Param("tokenHash") String tokenHash);

    /**
     * 新規リフレッシュトークンを1件登録する。実行すると、DBで採番されたIDが{@code refreshToken}に反映される。
     */
    void insert(RefreshToken refreshToken);

    void revoke(@Param("id") Long id);

    void revokeAllForUser(@Param("userId") Long userId);
}
