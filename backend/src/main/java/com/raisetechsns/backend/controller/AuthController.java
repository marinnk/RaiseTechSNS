package com.raisetechsns.backend.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.AuthUserResponse;
import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.security.AuthCookieFactory;
import com.raisetechsns.backend.security.JwtAuthenticationFilter;
import com.raisetechsns.backend.service.AuthService;
import com.raisetechsns.backend.service.RefreshTokenService;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieFactory authCookieFactory;
    private final RefreshTokenService refreshTokenService;

    public AuthController(
            AuthService authService, AuthCookieFactory authCookieFactory, RefreshTokenService refreshTokenService) {
        this.authService = authService;
        this.authCookieFactory = authCookieFactory;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthUserResponse register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        User user = authService.register(request);
        setAuthCookies(response, user);
        return AuthUserResponse.from(user);
    }

    @PostMapping("/login")
    public AuthUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        User user = authService.login(request.email(), request.password());
        setAuthCookies(response, user);
        return AuthUserResponse.from(user);
    }

    /**
     * アクセストークンが失効した際に、リフレッシュトークンを使ってアクセストークン・リフレッシュトークンの
     * 両方をローテーション（再発行）する。リフレッシュトークン自体がここでの認証情報のため、
     * このエンドポイントはアクセストークンによる認証を必要としない（{@code SecurityConfig}で{@code permitAll}）。
     */
    @PostMapping("/refresh")
    public AuthUserResponse refresh(
            @CookieValue(name = JwtAuthenticationFilter.REFRESH_TOKEN_COOKIE_NAME, required = false)
                    String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "refresh token is missing");
        }
        RefreshTokenService.RotationResult result = refreshTokenService.rotate(refreshToken);
        setAuthCookie(response, result.user());
        setRefreshCookie(response, result.refreshToken());
        return AuthUserResponse.from(result.user());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @CookieValue(name = JwtAuthenticationFilter.REFRESH_TOKEN_COOKIE_NAME, required = false)
                    String refreshToken,
            HttpServletResponse response) {
        if (refreshToken != null) {
            refreshTokenService.revoke(refreshToken);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.createLogoutCookie().toString());
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.createRefreshLogoutCookie().toString());
    }

    @GetMapping("/me")
    public AuthUserResponse me(@AuthenticationPrincipal User user) {
        return AuthUserResponse.from(user);
    }

    private void setAuthCookies(HttpServletResponse response, User user) {
        setAuthCookie(response, user);
        setRefreshCookie(response, refreshTokenService.issue(user));
    }

    private void setAuthCookie(HttpServletResponse response, User user) {
        ResponseCookie cookie = authCookieFactory.createAuthCookie(user);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void setRefreshCookie(HttpServletResponse response, String rawRefreshToken) {
        ResponseCookie cookie = authCookieFactory.createRefreshCookie(rawRefreshToken);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
