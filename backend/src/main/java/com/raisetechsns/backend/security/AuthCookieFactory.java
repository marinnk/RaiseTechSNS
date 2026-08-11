package com.raisetechsns.backend.security;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.raisetechsns.backend.entity.User;

/**
 * ログイン用JWTを保持するCookie（{@link JwtAuthenticationFilter#COOKIE_NAME}）の生成を担う。
 */
@Component
public class AuthCookieFactory {

    private final JwtService jwtService;
    private final boolean cookieSecure;
    private final long refreshTokenExpirationMs;

    public AuthCookieFactory(
            JwtService jwtService,
            @Value("${jwt.cookie-secure}") boolean cookieSecure,
            @Value("${jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs) {
        this.jwtService = jwtService;
        this.cookieSecure = cookieSecure;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    /**
     * ログイン・会員登録成功時に発行する、JWTを載せたCookie。
     */
    public ResponseCookie createAuthCookie(User user) {
        String token = jwtService.generateToken(user);
        return ResponseCookie.from(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
                .build();
    }

    /**
     * ログアウト時に発行する、アクセストークンCookieを失効させるためのCookie。
     */
    public ResponseCookie createLogoutCookie() {
        return ResponseCookie.from(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }

    /**
     * ログイン・会員登録成功時、およびリフレッシュ成功時に発行する、リフレッシュトークンを載せたCookie。
     *
     * <p>認証系エンドポイント（{@code /api/auth/**}）以外には送られないよう{@code path}を絞り、
     * トークンの露出範囲を最小化する。
     */
    public ResponseCookie createRefreshCookie(String rawRefreshToken) {
        return ResponseCookie.from(JwtAuthenticationFilter.REFRESH_TOKEN_COOKIE_NAME, rawRefreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(Duration.ofMillis(refreshTokenExpirationMs))
                .build();
    }

    /**
     * ログアウト時に発行する、リフレッシュトークンCookieを失効させるためのCookie。
     */
    public ResponseCookie createRefreshLogoutCookie() {
        return ResponseCookie.from(JwtAuthenticationFilter.REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(0)
                .build();
    }
}
