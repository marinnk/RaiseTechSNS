package com.raisetechsns.backend.security;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.raisetechsns.backend.mapper.UserMapper;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Cookieに載ったJWTを検証し、有効であればログイン中の利用者としてSecurityContextに設定する。
 * トークンが無い・無効な場合はそのまま未認証としてリクエストを通し、認可判定（{@code authorizeHttpRequests}）に委ねる。
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String ACCESS_TOKEN_COOKIE_NAME = "access_token";
    public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    private final JwtService jwtService;
    private final UserMapper userMapper;

    public JwtAuthenticationFilter(JwtService jwtService, UserMapper userMapper) {
        this.jwtService = jwtService;
        this.userMapper = userMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        findCookie(request, ACCESS_TOKEN_COOKIE_NAME)
                .flatMap(this::authenticate)
                .ifPresent(auth -> SecurityContextHolder.getContext().setAuthentication(auth));
        filterChain.doFilter(request, response);
    }

    private Optional<String> findCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(request.getCookies())
                .filter(cookie -> name.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst();
    }

    private Optional<Authentication> authenticate(String token) {
        try {
            Long userId = jwtService.parseUserId(token);
            return userMapper.findById(userId)
                    .map(user -> {
                        // MDCに乗せたuserIdは以降のログ行すべてに自動で付与される（クリアは
                        // RequestLoggingFilterがリクエスト完了時に一括で行う）
                        MDC.put("userId", String.valueOf(user.getId()));
                        return (Authentication) new UsernamePasswordAuthenticationToken(user, null, List.of());
                    });
        } catch (JwtException | NumberFormatException e) {
            return Optional.empty();
        }
    }
}
