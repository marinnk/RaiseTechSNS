package com.raisetechsns.backend.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.raisetechsns.backend.dto.AuthUserResponse;
import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.security.AuthCookieFactory;
import com.raisetechsns.backend.service.AuthService;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieFactory authCookieFactory;

    public AuthController(AuthService authService, AuthCookieFactory authCookieFactory) {
        this.authService = authService;
        this.authCookieFactory = authCookieFactory;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthUserResponse register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        User user = authService.register(request);
        setAuthCookie(response, user);
        return AuthUserResponse.from(user);
    }

    @PostMapping("/login")
    public AuthUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        User user = authService.login(request.email(), request.password());
        setAuthCookie(response, user);
        return AuthUserResponse.from(user);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, authCookieFactory.createLogoutCookie().toString());
    }

    @GetMapping("/me")
    public AuthUserResponse me(@AuthenticationPrincipal User user) {
        return AuthUserResponse.from(user);
    }

    private void setAuthCookie(HttpServletResponse response, User user) {
        ResponseCookie cookie = authCookieFactory.createAuthCookie(user);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
