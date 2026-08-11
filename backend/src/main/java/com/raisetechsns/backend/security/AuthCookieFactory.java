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

    public AuthCookieFactory(JwtService jwtService, @Value("${jwt.cookie-secure}") boolean cookieSecure) {
        this.jwtService = jwtService;
        this.cookieSecure = cookieSecure;
    }

    /**
     * ログイン・会員登録成功時に発行する、JWTを載せたCookie。
     */
    public ResponseCookie createAuthCookie(User user) {
        String token = jwtService.generateToken(user);
        return ResponseCookie.from(JwtAuthenticationFilter.COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
                .build();
    }

    /**
     * ログアウト時に発行する、失効させるためのCookie。
     */
    public ResponseCookie createLogoutCookie() {
        return ResponseCookie.from(JwtAuthenticationFilter.COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
    }
}
