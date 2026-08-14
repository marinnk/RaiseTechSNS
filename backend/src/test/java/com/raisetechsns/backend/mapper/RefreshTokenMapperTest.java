package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.RefreshToken;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link RefreshTokenMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 */
@SpringBootTest
@Transactional
class RefreshTokenMapperTest extends AbstractIntegrationTest {

    @Autowired
    private RefreshTokenMapper refreshTokenMapper;

    private Long insertToken(Long userId, String tokenHash) {
        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash(tokenHash);
        token.setExpiresAt(LocalDateTime.now().plusDays(14));
        refreshTokenMapper.insert(token);
        return token.getId();
    }

    @Test
    void insert_採番されたidがrefreshTokenに反映される() {
        Long userId = insertUser("taro");
        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setTokenHash("hash-value");
        token.setExpiresAt(LocalDateTime.now().plusDays(14));

        refreshTokenMapper.insert(token);

        assertThat(token.getId()).isNotNull().isPositive();
    }

    @Test
    void findByTokenHash_一致するハッシュ値なら取得できる() {
        Long userId = insertUser("taro");
        insertToken(userId, "hash-value");

        Optional<RefreshToken> found = refreshTokenMapper.findByTokenHash("hash-value");

        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo(userId);
    }

    @Test
    void findByTokenHash_一致しなければ空() {
        Optional<RefreshToken> found = refreshTokenMapper.findByTokenHash("nonexistent-hash");

        assertThat(found).isEmpty();
    }

    @Test
    void revoke_revokedAtが設定される() {
        Long userId = insertUser("taro");
        Long tokenId = insertToken(userId, "hash-value");
        assertThat(refreshTokenMapper.findByTokenHash("hash-value").orElseThrow().getRevokedAt()).isNull();

        refreshTokenMapper.revoke(tokenId);

        assertThat(refreshTokenMapper.findByTokenHash("hash-value").orElseThrow().getRevokedAt()).isNotNull();
    }

    @Test
    void revokeAllForUser_対象ユーザーの分だけ失効し他ユーザーには影響しない() {
        Long userA = insertUser("taro");
        Long userB = insertUser("jiro");
        insertToken(userA, "hash-a1");
        insertToken(userA, "hash-a2");
        insertToken(userB, "hash-b1");

        refreshTokenMapper.revokeAllForUser(userA);

        assertThat(refreshTokenMapper.findByTokenHash("hash-a1").orElseThrow().getRevokedAt()).isNotNull();
        assertThat(refreshTokenMapper.findByTokenHash("hash-a2").orElseThrow().getRevokedAt()).isNotNull();
        assertThat(refreshTokenMapper.findByTokenHash("hash-b1").orElseThrow().getRevokedAt()).isNull();
    }
}
