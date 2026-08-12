package com.raisetechsns.backend.controller;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.dto.UpdatePostRequest;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostControllerTest {

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

    private String postBody(String content) throws Exception {
        return objectMapper.writeValueAsString(new CreatePostRequest(content));
    }

    @Test
    void create_ログイン中なら投稿を作成できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-ok@example.com");

        mockMvc.perform(post("/api/posts")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("はじめての投稿")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("はじめての投稿"))
                .andExpect(jsonPath("$.username").value("taro"))
                .andExpect(jsonPath("$.isOwnedByMe").value(true));
    }

    @Test
    void create_投稿日時にはタイムゾーンオフセットが含まれる() throws Exception {
        // サーバー・ブラウザのタイムゾーンが異なっても投稿日時の表示がずれないよう、
        // createdAt/updatedAtにはオフセット（+09:00など）付きのISO8601文字列を返す契約になっている。
        // LocalDateTime（オフセット無し）に戻ってしまう回帰を検知するためのテスト。
        Cookie accessToken = registerAndLogin("taro", "create-tz@example.com");

        mockMvc.perform(post("/api/posts")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("投稿")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdAt", matchesPattern(".*(Z|[+-]\\d{2}:\\d{2})$")))
                .andExpect(jsonPath("$.updatedAt", matchesPattern(".*(Z|[+-]\\d{2}:\\d{2})$")));
    }

    @Test
    void create_未ログインなら401になる() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("投稿できないはず")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_本文が空なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-blank@example.com");

        mockMvc.perform(post("/api/posts")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody("")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_本文が281文字以上なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-toolong@example.com");
        String tooLong = "あ".repeat(281);

        mockMvc.perform(post("/api/posts")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postBody(tooLong)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_投稿一覧を新しい順に取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-order@example.com");
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("1件目")));
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("2件目")));

        mockMvc.perform(get("/api/posts").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts[0].content").value("2件目"))
                .andExpect(jsonPath("$.posts[1].content").value("1件目"));
    }

    @Test
    void list_beforeIdで指定したidより古い投稿だけ取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-before@example.com");
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("1件目")));
        var second = mockMvc.perform(post("/api/posts")
                        .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("2件目")))
                .andReturn();
        int secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(get("/api/posts").param("beforeId", String.valueOf(secondId)).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("1件目"));
    }

    @Test
    void list_afterIdで指定したidより新しい投稿だけ取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-after@example.com");
        var first = mockMvc.perform(post("/api/posts")
                        .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("1件目")))
                .andReturn();
        int firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asInt();
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("2件目")));

        mockMvc.perform(get("/api/posts").param("afterId", String.valueOf(firstId)).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("2件目"));
    }

    @Test
    void list_afterIdでlimitを超える新着があっても2回に分けて取りこぼし無く取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-after-burst@example.com");
        var first = mockMvc.perform(post("/api/posts")
                        .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("基準の投稿")))
                .andReturn();
        int firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asInt();
        // 基準の投稿の後に、limit（2）を超える3件を連続投稿する
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("新着1")));
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("新着2")));
        mockMvc.perform(post("/api/posts")
                .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("新着3")));

        // 1回目のポーリング：limit=2なので、取りこぼしを防ぐため古い方から2件（新着1・新着2）が返るはず
        var firstPoll = mockMvc.perform(get("/api/posts")
                        .param("afterId", String.valueOf(firstId)).param("limit", "2").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(2))
                .andExpect(jsonPath("$.posts[0].content").value("新着2"))
                .andExpect(jsonPath("$.posts[1].content").value("新着1"))
                .andReturn();
        int secondNewestId = objectMapper.readTree(firstPoll.getResponse().getContentAsString())
                .get("posts").get(0).get("id").asInt();

        // 2回目のポーリング：1回目で取得した最新idを基準にすると、残りの「新着3」が取りこぼし無く取得できる
        mockMvc.perform(get("/api/posts")
                        .param("afterId", String.valueOf(secondNewestId)).param("limit", "2").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("新着3"));
    }

    @Test
    void update_自分の投稿を編集できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "update-ok@example.com");
        var created = mockMvc.perform(post("/api/posts")
                        .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("編集前")))
                .andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(put("/api/posts/" + postId)
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdatePostRequest("編集後"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("編集後"));
    }

    @Test
    void update_他人の投稿を編集しようとすると403になる() throws Exception {
        Cookie ownerCookie = registerAndLogin("taro", "update-owner@example.com");
        var created = mockMvc.perform(post("/api/posts")
                        .cookie(ownerCookie).contentType(MediaType.APPLICATION_JSON).content(postBody("他人の投稿")))
                .andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        Cookie otherCookie = registerAndLogin("jiro", "update-other@example.com");

        mockMvc.perform(put("/api/posts/" + postId)
                        .cookie(otherCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdatePostRequest("勝手に編集"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void delete_自分の投稿を削除できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "delete-ok@example.com");
        var created = mockMvc.perform(post("/api/posts")
                        .cookie(accessToken).contentType(MediaType.APPLICATION_JSON).content(postBody("削除される投稿")))
                .andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(delete("/api/posts/" + postId).cookie(accessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_他人の投稿を削除しようとすると403になる() throws Exception {
        Cookie ownerCookie = registerAndLogin("taro", "delete-owner@example.com");
        var created = mockMvc.perform(post("/api/posts")
                        .cookie(ownerCookie).contentType(MediaType.APPLICATION_JSON).content(postBody("他人の投稿")))
                .andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        Cookie otherCookie = registerAndLogin("jiro", "delete-other@example.com");

        mockMvc.perform(delete("/api/posts/" + postId).cookie(otherCookie))
                .andExpect(status().isForbidden());
    }
}
