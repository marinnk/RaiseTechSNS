package com.raisetechsns.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.raisetechsns.backend.dto.UpdateProfileRequest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private Cookie registerAndLogin(String username, String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RegisterRequest(username, email, "password1"))));

        var loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, "password1"))))
                .andExpect(status().isOk())
                .andReturn();
        return loginResult.getResponse().getCookie("access_token");
    }

    private int currentUserId(Cookie accessToken) throws Exception {
        var result = mockMvc.perform(get("/api/auth/me").cookie(accessToken)).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asInt();
    }

    @Test
    void get_本人のプロフィールはisOwnedByMeがtrueになる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "profile-own@example.com");
        int userId = currentUserId(accessToken);

        mockMvc.perform(get("/api/users/" + userId).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("taro"))
                .andExpect(jsonPath("$.isOwnedByMe").value(true))
                .andExpect(jsonPath("$.followerCount").value(0))
                .andExpect(jsonPath("$.followingCount").value(0));
    }

    @Test
    void get_他人のプロフィールはisOwnedByMeがfalseになる() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "profile-other-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "profile-other-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(get("/api/users/" + jiroId).cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isOwnedByMe").value(false));
    }

    @Test
    void get_存在しない利用者なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "profile-404@example.com");

        mockMvc.perform(get("/api/users/999999").cookie(accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void get_未ログインなら401になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "profile-unauth@example.com");
        int userId = currentUserId(accessToken);

        mockMvc.perform(get("/api/users/" + userId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateMe_自己紹介を更新できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "profile-update-ok@example.com");

        mockMvc.perform(put("/api/users/me")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest("よろしくお願いします"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("よろしくお願いします"));
    }

    @Test
    void updateMe_160文字ちょうどなら更新できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "profile-update-160@example.com");
        String bio = "あ".repeat(160);

        mockMvc.perform(put("/api/users/me")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest(bio))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value(bio));
    }

    @Test
    void updateMe_161文字以上なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "profile-update-161@example.com");
        String tooLong = "あ".repeat(161);

        mockMvc.perform(put("/api/users/me")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest(tooLong))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateMe_未ログインなら401になる() throws Exception {
        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest("更新できないはず"))))
                .andExpect(status().isUnauthorized());
    }
}
