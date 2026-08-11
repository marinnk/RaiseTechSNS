package com.raisetechsns.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.entity.RefreshToken;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.RefreshTokenMapper;
import com.raisetechsns.backend.mapper.UserMapper;

/**
 * リフレッシュトークンの発行・ローテーション・失効を行う。
 *
 * <p>トークンはランダムな不透明文字列（JWTではない）として発行し、DBには生の値ではなく
 * SHA-256ハッシュのみを保存する。パスワードと違いトークン自体が既に高エントロピーな乱数のため、
 * BCryptのような低速・ソルト付きハッシュは不要（ソルト付きだとハッシュ値でのINDEX検索もできない）。
 * ローテーション（使い回し禁止）と、失効済みトークンの再利用検知（盗用の兆候とみなし該当利用者の
 * 全トークンを失効）により、ログアウト・トークン漏えい時の実質的な無効化を可能にする。
 */
@Service
public class RefreshTokenService {

    private static final Logger LOG = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final String INVALID_TOKEN_MESSAGE = "invalid refresh token";
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenMapper refreshTokenMapper;
    private final UserMapper userMapper;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long refreshTokenExpirationMs;

    public RefreshTokenService(
            RefreshTokenMapper refreshTokenMapper,
            UserMapper userMapper,
            @Value("${jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs) {
        this.refreshTokenMapper = refreshTokenMapper;
        this.userMapper = userMapper;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    /**
     * 新しいリフレッシュトークンを発行し、DBにハッシュ値を保存する。
     *
     * @return Cookieに載せる生のトークン文字列
     */
    @Transactional
    public String issue(User user) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setTokenHash(hash(rawToken));
        refreshToken.setExpiresAt(LocalDateTime.now().plusNanos(refreshTokenExpirationMs * 1_000_000));
        refreshTokenMapper.insert(refreshToken);

        return rawToken;
    }

    /**
     * リフレッシュトークンをローテーションする：渡されたトークンを失効させ、新しいトークンを発行する。
     *
     * @throws ResponseStatusException トークンが存在しない・期限切れ・既に失効済みの場合（401）
     */
    @Transactional
    public RotationResult rotate(String rawToken) {
        RefreshToken existing = refreshTokenMapper.findByTokenHash(hash(rawToken))
                .orElseThrow(this::unauthorized);

        if (existing.getRevokedAt() != null) {
            // 既に失効済みのトークンが再度使われた＝盗用の疑いがあるため、
            // このトークンの持ち主の全リフレッシュトークンを失効させる
            LOG.warn("revoked refresh token reused, revoking all sessions: userId={}", existing.getUserId());
            refreshTokenMapper.revokeAllForUser(existing.getUserId());
            throw unauthorized();
        }
        if (existing.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw unauthorized();
        }

        refreshTokenMapper.revoke(existing.getId());
        User user = userMapper.findById(existing.getUserId()).orElseThrow(this::unauthorized);
        String newRawToken = issue(user);
        return new RotationResult(user, newRawToken);
    }

    /**
     * ログアウト時にリフレッシュトークンを失効させる。該当するトークンが無くても何もしない（冪等）。
     */
    @Transactional
    public void revoke(String rawToken) {
        refreshTokenMapper.findByTokenHash(hash(rawToken))
                .ifPresent(token -> refreshTokenMapper.revoke(token.getId()));
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256は全JVMで標準サポートされているため、実行時に到達することはない
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_TOKEN_MESSAGE);
    }

    public record RotationResult(User user, String refreshToken) {
    }
}
