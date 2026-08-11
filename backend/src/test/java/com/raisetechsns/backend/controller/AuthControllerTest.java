package com.raisetechsns.backend.controller;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerBody(String username, String email, String password) throws Exception {
        return objectMapper.writeValueAsString(new RegisterRequest(username, email, password));
    }

    private String loginBody(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(new LoginRequest(email, password));
    }

    @Test
    void register_新規登録すると201とログイン用Cookieが返る() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("taro", "taro@example.com", "password1")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("taro"))
                .andExpect(jsonPath("$.email").value("taro@example.com"))
                .andExpect(jsonPath("$.displayName").value("taro"))
                .andExpect(cookie().exists("access_token"));
    }

    @Test
    void register_メールアドレスが重複していると409になる() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("taro", "dup@example.com", "password1")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("jiro", "dup@example.com", "password1")))
                .andExpect(status().isConflict());
    }

    @Test
    void register_バリデーションエラーの場合は400になる() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("", "not-an-email", "short")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void login_登録済みの認証情報でログインすると200とログイン用Cookieが返る() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("taro", "login-ok@example.com", "password1")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("login-ok@example.com", "password1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("login-ok@example.com"))
                .andExpect(cookie().exists("access_token"));
    }

    @Test
    void login_パスワードが誤っていると401になる() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody("taro", "login-ng@example.com", "password1")));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("login-ng@example.com", "wrong-password")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_未ログインだと401になる() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_ログイン中ならログイン中の利用者情報を返す() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("taro", "me@example.com", "password1")));

        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("me@example.com", "password1")))
                .andExpect(status().isOk())
                .andReturn();
        Cookie accessToken = loginResult.getResponse().getCookie("access_token");

        mockMvc.perform(get("/api/auth/me").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@example.com"))
                .andExpect(jsonPath("$.id").value(notNullValue()));
    }

    @Test
    void logout_呼び出すとCookieが失効する() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerBody("taro", "logout@example.com", "password1")));

        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("logout@example.com", "password1")))
                .andExpect(status().isOk())
                .andReturn();
        Cookie accessToken = loginResult.getResponse().getCookie("access_token");

        mockMvc.perform(post("/api/auth/logout").cookie(accessToken))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("access_token", 0));
    }

    @Test
    void logout_未ログインだと401になる() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }
}
