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

import com.raisetechsns.backend.dto.CreateCommentRequest;
import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CommentControllerTest {

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

    private int createPost(Cookie accessToken, String content) throws Exception {
        var result = mockMvc.perform(post("/api/posts")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreatePostRequest(content))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asInt();
    }

    private String commentBody(String content) throws Exception {
        return objectMapper.writeValueAsString(new CreateCommentRequest(content));
    }

    @Test
    void list_投稿のコメント一覧を古い順に取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-list-order@example.com");
        int postId = createPost(accessToken, "投稿");
        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(commentBody("1件目")));
        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(commentBody("2件目")));

        mockMvc.perform(get("/api/posts/" + postId + "/comments").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments[0].content").value("1件目"))
                .andExpect(jsonPath("$.comments[1].content").value("2件目"));
    }

    @Test
    void list_未ログインなら401になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-list-unauth@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(get("/api/posts/" + postId + "/comments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void list_存在しない投稿なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-list-404@example.com");

        mockMvc.perform(get("/api/posts/999999/comments").cookie(accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_ログイン中ならコメントを作成できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-create-ok@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(commentBody("はじめてのコメント")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("はじめてのコメント"))
                .andExpect(jsonPath("$.username").value("taro"))
                .andExpect(jsonPath("$.isOwnedByMe").value(true));
    }

    @Test
    void create_本文が空なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-create-blank@example.com");
        int postId = createPost(accessToken, "投稿");

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(commentBody("")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_本文が281文字以上なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-create-toolong@example.com");
        int postId = createPost(accessToken, "投稿");
        String tooLong = "あ".repeat(281);

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(commentBody(tooLong)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_存在しない投稿なら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-create-404@example.com");

        mockMvc.perform(post("/api/posts/999999/comments")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(commentBody("コメント")))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_自分のコメントを削除できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-delete-ok@example.com");
        int postId = createPost(accessToken, "投稿");
        var created = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(commentBody("削除される")))
                .andReturn();
        int commentId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(delete("/api/comments/" + commentId).cookie(accessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_他人のコメントを削除しようとすると403になる() throws Exception {
        Cookie ownerCookie = registerAndLogin("taro", "comment-delete-owner@example.com");
        int postId = createPost(ownerCookie, "投稿");
        var created = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .cookie(ownerCookie).contentType(MediaType.APPLICATION_JSON).content(commentBody("他人のコメント")))
                .andReturn();
        int commentId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        Cookie otherCookie = registerAndLogin("jiro", "comment-delete-other@example.com");

        mockMvc.perform(delete("/api/comments/" + commentId).cookie(otherCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void delete_存在しないコメントなら404になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "comment-delete-404@example.com");

        mockMvc.perform(delete("/api/comments/999999").cookie(accessToken))
                .andExpect(status().isNotFound());
    }
}
