package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.entity.RefreshToken;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.RefreshTokenMapper;
import com.raisetechsns.backend.mapper.UserMapper;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final long EXPIRATION_MS = 60_000L;

    @Mock
    private RefreshTokenMapper refreshTokenMapper;

    @Mock
    private UserMapper userMapper;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        // @Value("${jwt.refresh-token-expiration-ms}")はDIコンテナ経由でしか解決されないため、
        // @InjectMocksは使わず有効なテスト用の値を明示的に渡してコンストラクタで組み立てる
        refreshTokenService = new RefreshTokenService(refreshTokenMapper, userMapper, EXPIRATION_MS);
    }

    private static User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setDisplayName(username);
        return user;
    }

    @Test
    void issue_呼ぶたびに異なるトークンを返す() {
        User user = user(1L, "taro");

        String token1 = refreshTokenService.issue(user);
        String token2 = refreshTokenService.issue(user);

        assertThat(token1).isNotEqualTo(token2);
        verify(refreshTokenMapper, times(2)).insert(any(RefreshToken.class));
    }

    @Test
    void rotate_有効なトークンなら新しいトークンとユーザーを返し古いトークンを失効させる() {
        User user = user(1L, "taro");
        String rawToken = refreshTokenService.issue(user);

        ArgumentCaptor<RefreshToken> insertCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenMapper).insert(insertCaptor.capture());
        RefreshToken issued = insertCaptor.getValue();
        // MyBatisのinsert()はuseGeneratedKeysによりDB採番されたidを引数のオブジェクトへ反映する。
        // ここではモックのためその挙動を再現する
        issued.setId(100L);

        when(refreshTokenMapper.findByTokenHash(issued.getTokenHash())).thenReturn(Optional.of(issued));
        when(userMapper.findById(1L)).thenReturn(Optional.of(user));

        RefreshTokenService.RotationResult result = refreshTokenService.rotate(rawToken);

        assertThat(result.user()).isEqualTo(user);
        assertThat(result.refreshToken()).isNotEqualTo(rawToken);
        verify(refreshTokenMapper).revoke(100L);
        verify(refreshTokenMapper, times(2)).insert(any(RefreshToken.class));
    }

    @Test
    void rotate_存在しないトークンの場合は401になる() {
        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> refreshTokenService.rotate("unknown-token"));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rotate_期限切れのトークンの場合は401になる() {
        RefreshToken expired = new RefreshToken();
        expired.setId(1L);
        expired.setUserId(1L);
        expired.setTokenHash("expired-hash");
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> refreshTokenService.rotate("expired-token"));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenMapper, never()).revoke(anyLong());
    }

    @Test
    void rotate_失効済みトークンを再利用するとそのユーザーの全トークンが失効する() {
        RefreshToken revoked = new RefreshToken();
        revoked.setId(5L);
        revoked.setUserId(42L);
        revoked.setTokenHash("revoked-hash");
        revoked.setExpiresAt(LocalDateTime.now().plusDays(1));
        revoked.setRevokedAt(LocalDateTime.now().minusMinutes(1));
        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(Optional.of(revoked));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> refreshTokenService.rotate("reused-token"));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(refreshTokenMapper).revokeAllForUser(42L);
        verify(refreshTokenMapper, never()).revoke(anyLong());
    }

    @Test
    void revoke_該当トークンがあれば失効させる() {
        RefreshToken stored = new RefreshToken();
        stored.setId(7L);
        stored.setUserId(1L);
        stored.setTokenHash("some-hash");
        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(Optional.of(stored));

        refreshTokenService.revoke("raw-token");

        verify(refreshTokenMapper).revoke(7L);
    }

    @Test
    void revoke_該当トークンが無ければ何もしない() {
        when(refreshTokenMapper.findByTokenHash(anyString())).thenReturn(Optional.empty());

        refreshTokenService.revoke("unknown-token");

        verify(refreshTokenMapper, never()).revoke(anyLong());
    }
}
