package com.raisetechsns.backend.security;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.raisetechsns.backend.repository.UserRepository;

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

    public static final String COOKIE_NAME = "access_token";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        findCookie(request, COOKIE_NAME)
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
            return userRepository.findById(userId)
                    .map(user -> (Authentication) new UsernamePasswordAuthenticationToken(user, null, List.of()));
        } catch (JwtException | NumberFormatException e) {
            return Optional.empty();
        }
    }
}
