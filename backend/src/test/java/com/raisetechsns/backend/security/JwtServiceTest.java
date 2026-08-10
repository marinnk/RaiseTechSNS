package com.raisetechsns.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.raisetechsns.backend.entity.User;

import io.jsonwebtoken.JwtException;

class JwtServiceTest {

    private static final String SECRET = "test-secret-key-must-be-at-least-32-bytes-long";

    private static User user(long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }

    @Test
    void generateToken_parseUserId_発行したトークンから利用者IDを取得できる() {
        JwtService jwtService = new JwtService(SECRET, 60_000L);

        String token = jwtService.generateToken(user(42L, "taro"));

        assertThat(jwtService.parseUserId(token)).isEqualTo(42L);
    }

    @Test
    void parseUserId_有効期限切れのトークンは例外になる() {
        JwtService jwtService = new JwtService(SECRET, -1_000L);

        String token = jwtService.generateToken(user(1L, "taro"));

        assertThrows(JwtException.class, () -> jwtService.parseUserId(token));
    }

    @Test
    void parseUserId_署名鍵が異なるトークンは例外になる() {
        JwtService issuer = new JwtService(SECRET, 60_000L);
        JwtService verifier = new JwtService("another-secret-key-that-is-also-32-bytes-plus", 60_000L);

        String token = issuer.generateToken(user(1L, "taro"));

        assertThrows(JwtException.class, () -> verifier.parseUserId(token));
    }

    @Test
    void parseUserId_改ざんされたトークンは例外になる() {
        JwtService jwtService = new JwtService(SECRET, 60_000L);
        String token = jwtService.generateToken(user(1L, "taro"));
        String tampered = token.substring(0, token.length() - 1) + (token.endsWith("a") ? "b" : "a");

        assertThrows(JwtException.class, () -> jwtService.parseUserId(tampered));
    }
}
