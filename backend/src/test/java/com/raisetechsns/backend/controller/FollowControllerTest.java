package com.raisetechsns.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.raisetechsns.backend.support.AbstractIntegrationTest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FollowControllerTest extends AbstractIntegrationTest {

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
    void follow_フォローするとfollowerCountが1増えfollowedByMeがtrueになる() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "follow-ok-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "follow-ok-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followedByMe").value(true))
                .andExpect(jsonPath("$.followerCount").value(1));
    }

    @Test
    void follow_2回連続でフォローしても冪等でfollowerCountは1のまま() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "follow-idempotent-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "follow-idempotent-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followerCount").value(1));
    }

    @Test
    void follow_自分自身をフォローしようとすると400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "follow-self@example.com");
        int taroId = currentUserId(accessToken);

        mockMvc.perform(post("/api/users/" + taroId + "/follow").cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void follow_存在しない利用者をフォローしようとすると404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "follow-404@example.com");

        mockMvc.perform(post("/api/users/999999/follow").cookie(accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void follow_未ログインなら401になる() throws Exception {
        Cookie jirosCookie = registerAndLogin("jiro", "follow-unauth-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(post("/api/users/" + jiroId + "/follow"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void follow_userIdが数値でない場合は400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "follow-badid@example.com");

        mockMvc.perform(post("/api/users/abc/follow").cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unfollow_フォローを解除するとfollowerCountが減りfollowedByMeがfalseになる() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "unfollow-ok-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "unfollow-ok-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);
        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie));

        mockMvc.perform(delete("/api/users/" + jiroId + "/follow").cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followedByMe").value(false))
                .andExpect(jsonPath("$.followerCount").value(0));
    }

    @Test
    void unfollow_フォローしていない状態で解除しても冪等に200が返る() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "unfollow-idempotent-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "unfollow-idempotent-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(delete("/api/users/" + jiroId + "/follow").cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followerCount").value(0));
    }

    @Test
    void unfollow_未ログインなら401になる() throws Exception {
        Cookie jirosCookie = registerAndLogin("jiro", "unfollow-unauth-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(delete("/api/users/" + jiroId + "/follow"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unfollow_存在しない利用者を解除しようとすると404になる() throws Exception {
        // unfollowはfollowと違いDELETE前の存在確認を行わないが、その後currentStateの
        // findByIdWithStatsが対象の不在を検知して404にする
        Cookie accessToken = registerAndLogin("taro", "unfollow-404@example.com");

        mockMvc.perform(delete("/api/users/999999/follow").cookie(accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void followers_フォロー登録後に一覧へ反映される() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "followers-list-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "followers-list-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);
        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie));

        mockMvc.perform(get("/api/users/" + jiroId + "/followers").cookie(jirosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users.length()").value(1))
                .andExpect(jsonPath("$.users[0].username").value("taro"));
    }

    @Test
    void following_フォロー登録後に一覧へ反映される() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "following-list-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "following-list-jiro@example.com");
        int taroId = currentUserId(tarosCookie);
        int jiroId = currentUserId(jirosCookie);
        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie));

        mockMvc.perform(get("/api/users/" + taroId + "/following").cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users.length()").value(1))
                .andExpect(jsonPath("$.users[0].username").value("jiro"))
                .andExpect(jsonPath("$.users[0].followedByMe").value(true));
    }

    @Test
    void followers_未ログインなら401になる() throws Exception {
        Cookie jirosCookie = registerAndLogin("jiro", "followers-unauth-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(get("/api/users/" + jiroId + "/followers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void followers_存在しない利用者なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "followers-404@example.com");

        mockMvc.perform(get("/api/users/999999/followers").cookie(accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void following_未ログインなら401になる() throws Exception {
        Cookie jirosCookie = registerAndLogin("jiro", "following-unauth-jiro@example.com");
        int jiroId = currentUserId(jirosCookie);

        mockMvc.perform(get("/api/users/" + jiroId + "/following"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void following_存在しない利用者なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "following-404@example.com");

        mockMvc.perform(get("/api/users/999999/following").cookie(accessToken))
                .andExpect(status().isNotFound());
    }
}
