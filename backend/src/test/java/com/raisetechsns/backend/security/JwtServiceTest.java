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
        String tampered = tamperPayloadMiddleChar(token);

        assertThrows(JwtException.class, () -> jwtService.parseUserId(tampered));
    }

    /**
     * JWT（header.payload.signature）のpayload部分の、末尾ではない位置の1文字を書き換える。
     * base64urlは3バイトごとに4文字に変換するため、セグメントの元データ長が3の倍数でない場合、
     * セグメント末尾の文字には実データを持たない「paddingビット」が含まれることがある。
     * 末尾1文字だけを書き換える方式だと、たまたまpaddingビットしか変化しない組み合わせに
     * 当たった回だけデコード結果が変わらず、署名検証をすり抜けてテストが失敗（flaky）していた。
     * セグメントの途中の文字であればpaddingの影響を受けないため、確実にデコード結果が変わり、
     * 決定的に改ざんを検知できる。
     */
    private static String tamperPayloadMiddleChar(String token) {
        String[] parts = token.split("\\.");
        String payload = parts[1];
        int middle = payload.length() / 2;
        char original = payload.charAt(middle);
        char replaced = original == 'a' ? 'b' : 'a';
        String tamperedPayload = payload.substring(0, middle) + replaced + payload.substring(middle + 1);
        return parts[0] + "." + tamperedPayload + "." + parts[2];
    }
}
