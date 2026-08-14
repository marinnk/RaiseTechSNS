package com.raisetechsns.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LikeControllerTest extends AbstractIntegrationTest {

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

    // POST /api/posts はテキストと画像を1回の操作でまとめて送信する設計のため、
    // テキストのみの投稿でもmultipart/form-dataを使う（dataパートにJSON形式のリクエストを積む）
    private int createPost(Cookie accessToken, String content) throws Exception {
        MockMultipartFile data = new MockMultipartFile(
                "data", "", MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(new CreatePostRequest(content)));
        var result = mockMvc.perform(multipart("/api/posts").file(data).cookie(accessToken)).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asInt();
    }

    @Test
    void like_いいねするとlikeCountが1増えlikedByMeがtrueになる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "like-ok@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(post("/api/posts/" + postId + "/likes").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1))
                .andExpect(jsonPath("$.likedByMe").value(true));
    }

    @Test
    void like_2回連続でいいねしても冪等でlikeCountは1のまま() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "like-idempotent@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(post("/api/posts/" + postId + "/likes").cookie(accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/posts/" + postId + "/likes").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1));
    }

    @Test
    void like_未ログインなら401になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "like-unauth@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(post("/api/posts/" + postId + "/likes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void like_postIdが数値でない場合は400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "like-badid@example.com");

        mockMvc.perform(post("/api/posts/abc/likes").cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void like_存在しない投稿なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "like-404@example.com");

        mockMvc.perform(post("/api/posts/999999/likes").cookie(accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void unlike_いいねを取り消すとlikeCountが減りlikedByMeがfalseになる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "unlike-ok@example.com");
        int postId = createPost(accessToken, "投稿");
        mockMvc.perform(post("/api/posts/" + postId + "/likes").cookie(accessToken));

        mockMvc.perform(delete("/api/posts/" + postId + "/likes").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.likedByMe").value(false));
    }

    @Test
    void unlike_いいねしていない状態で取り消しても冪等に200が返る() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "unlike-idempotent@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(delete("/api/posts/" + postId + "/likes").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(0));
    }

    @Test
    void unlike_未ログインなら401になる() throws Exception {
        // 認証はSpring Securityのフィルターでコントローラーより前に判定されるため、
        // 投稿が実在するかどうかは結果に影響しない（存在しないidのままでよい）
        mockMvc.perform(delete("/api/posts/999999/likes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unlike_存在しない投稿なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "unlike-404@example.com");

        mockMvc.perform(delete("/api/posts/999999/likes").cookie(accessToken))
                .andExpect(status().isNotFound());
    }
}
