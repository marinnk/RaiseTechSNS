package com.raisetechsns.backend.controller;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.dto.CreateCommentRequest;
import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.LoginRequest;
import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.dto.UpdatePostRequest;
import com.raisetechsns.backend.storage.StorageService;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // 実際のS3には接続せず、アップロードの呼び出しだけを検証するためモックに差し替える
    @MockitoBean
    private StorageService storageService;

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

    /**
     * テキストのみの投稿でも{@code POST /api/posts}はmultipart/form-dataを使う（テキストと画像を
     * 1回の操作でまとめて送信する設計のため）。{@code data}パートにJSON形式のリクエストを積む。
     */
    private MockMultipartHttpServletRequestBuilder createPostRequest(String content, MockMultipartFile... images)
            throws Exception {
        MockMultipartFile data = new MockMultipartFile(
                "data", "", MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(new CreatePostRequest(content)));
        var builder = multipart("/api/posts").file(data);
        for (MockMultipartFile image : images) {
            builder = builder.file(image);
        }
        return builder;
    }

    private MockMultipartHttpServletRequestBuilder updatePostRequest(
            long postId, String content, List<Long> keepImageIds, MockMultipartFile... images) throws Exception {
        MockMultipartFile data = new MockMultipartFile(
                "data", "", MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(new UpdatePostRequest(content, keepImageIds)));
        var builder = (MockMultipartHttpServletRequestBuilder)
                multipart(HttpMethod.PUT, "/api/posts/{postId}", postId).file(data);
        for (MockMultipartFile image : images) {
            builder = builder.file(image);
        }
        return builder;
    }

    private static MockMultipartFile jpegImage(String name) {
        return new MockMultipartFile("images", name, "image/jpeg", new byte[10]);
    }

    @Test
    void create_ログイン中なら投稿を作成できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-ok@example.com");

        mockMvc.perform(createPostRequest("はじめての投稿").cookie(accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("はじめての投稿"))
                .andExpect(jsonPath("$.username").value("taro"))
                .andExpect(jsonPath("$.isOwnedByMe").value(true))
                .andExpect(jsonPath("$.images").isArray())
                .andExpect(jsonPath("$.images").isEmpty());
    }

    @Test
    void create_投稿日時にはタイムゾーンオフセットが含まれる() throws Exception {
        // サーバー・ブラウザのタイムゾーンが異なっても投稿日時の表示がずれないよう、
        // createdAt/updatedAtにはオフセット（+09:00など）付きのISO8601文字列を返す契約になっている。
        // LocalDateTime（オフセット無し）に戻ってしまう回帰を検知するためのテスト。
        Cookie accessToken = registerAndLogin("taro", "create-tz@example.com");

        mockMvc.perform(createPostRequest("投稿").cookie(accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdAt", matchesPattern(".*(Z|[+-]\\d{2}:\\d{2})$")))
                .andExpect(jsonPath("$.updatedAt", matchesPattern(".*(Z|[+-]\\d{2}:\\d{2})$")));
    }

    @Test
    void create_未ログインなら401になる() throws Exception {
        mockMvc.perform(createPostRequest("投稿できないはず"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_本文が空なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-blank@example.com");

        mockMvc.perform(createPostRequest("").cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_本文が281文字以上なら400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-toolong@example.com");
        String tooLong = "あ".repeat(281);

        mockMvc.perform(createPostRequest(tooLong).cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_画像を添付して投稿できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-with-images@example.com");
        when(storageService.upload(eq("posts"), any())).thenReturn("https://example.com/posts/x.jpg");

        mockMvc.perform(createPostRequest("画像付き投稿", jpegImage("a.jpg"), jpegImage("b.jpg")).cookie(accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.images.length()").value(2))
                .andExpect(jsonPath("$.images[0].imageUrl").value("https://example.com/posts/x.jpg"));
    }

    @Test
    void create_画像が5枚だと400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-too-many-images@example.com");

        mockMvc.perform(createPostRequest("投稿", jpegImage("1.jpg"), jpegImage("2.jpg"), jpegImage("3.jpg"),
                        jpegImage("4.jpg"), jpegImage("5.jpg"))
                        .cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_jpg_png以外の画像は400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-bad-image-type@example.com");
        MockMultipartFile textFile = new MockMultipartFile("images", "note.txt", "text/plain", new byte[10]);

        mockMvc.perform(createPostRequest("投稿", textFile).cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_投稿一覧を新しい順に取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-order@example.com");
        mockMvc.perform(createPostRequest("1件目").cookie(accessToken));
        mockMvc.perform(createPostRequest("2件目").cookie(accessToken));

        mockMvc.perform(get("/api/posts").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts[0].content").value("2件目"))
                .andExpect(jsonPath("$.posts[1].content").value("1件目"));
    }

    @Test
    void list_投稿が0件でも200で空配列が返る() throws Exception {
        // postIdsが空のままpostImageMapper.findByPostIdsを呼ぶと、生成されるSQLのIN (...)が
        // 空になり構文エラーになる不具合の再発防止テスト（投稿0件のタイムラインで毎回発生しうる）
        Cookie accessToken = registerAndLogin("taro", "list-empty@example.com");

        mockMvc.perform(get("/api/posts").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts").isArray())
                .andExpect(jsonPath("$.posts").isEmpty());
    }

    @Test
    void list_beforeIdで指定したidより古い投稿だけ取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-before@example.com");
        mockMvc.perform(createPostRequest("1件目").cookie(accessToken));
        var second = mockMvc.perform(createPostRequest("2件目").cookie(accessToken)).andReturn();
        int secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(get("/api/posts").param("beforeId", String.valueOf(secondId)).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("1件目"));
    }

    @Test
    void list_afterIdで指定したidより新しい投稿だけ取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-after@example.com");
        var first = mockMvc.perform(createPostRequest("1件目").cookie(accessToken)).andReturn();
        int firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asInt();
        mockMvc.perform(createPostRequest("2件目").cookie(accessToken));

        mockMvc.perform(get("/api/posts").param("afterId", String.valueOf(firstId)).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("2件目"));
    }

    @Test
    void list_afterIdでlimitを超える新着があっても2回に分けて取りこぼし無く取得できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-after-burst@example.com");
        var first = mockMvc.perform(createPostRequest("基準の投稿").cookie(accessToken)).andReturn();
        int firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asInt();
        // 基準の投稿の後に、limit（2）を超える3件を連続投稿する
        mockMvc.perform(createPostRequest("新着1").cookie(accessToken));
        mockMvc.perform(createPostRequest("新着2").cookie(accessToken));
        mockMvc.perform(createPostRequest("新着3").cookie(accessToken));

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
    void list_userIdを指定すると指定した利用者の投稿のみ取得できる() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "list-userid-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "list-userid-jiro@example.com");
        var taroPost = mockMvc.perform(createPostRequest("太郎の投稿").cookie(tarosCookie)).andReturn();
        int taroUserId = objectMapper.readTree(taroPost.getResponse().getContentAsString()).get("userId").asInt();
        mockMvc.perform(createPostRequest("次郎の投稿").cookie(jirosCookie));

        mockMvc.perform(get("/api/posts").param("userId", String.valueOf(taroUserId)).cookie(jirosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(1))
                .andExpect(jsonPath("$.posts[0].content").value("太郎の投稿"));
    }

    @Test
    void list_scopeがfollowingならフォロー中と自分の投稿のみ取得できる() throws Exception {
        Cookie tarosCookie = registerAndLogin("taro", "list-scope-taro@example.com");
        Cookie jirosCookie = registerAndLogin("jiro", "list-scope-jiro@example.com");
        Cookie hanakosCookie = registerAndLogin("hanako", "list-scope-hanako@example.com");
        int jiroId = objectMapper.readTree(
                mockMvc.perform(get("/api/auth/me").cookie(jirosCookie)).andReturn().getResponse().getContentAsString())
                .get("id").asInt();
        mockMvc.perform(createPostRequest("自分の投稿").cookie(tarosCookie));
        mockMvc.perform(createPostRequest("フォロー中の投稿").cookie(jirosCookie));
        mockMvc.perform(createPostRequest("未フォローの投稿").cookie(hanakosCookie));
        mockMvc.perform(post("/api/users/" + jiroId + "/follow").cookie(tarosCookie));

        mockMvc.perform(get("/api/posts").param("scope", "following").cookie(tarosCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posts.length()").value(2))
                .andExpect(jsonPath("$.posts[0].content").value("フォロー中の投稿"))
                .andExpect(jsonPath("$.posts[1].content").value("自分の投稿"));
    }

    @Test
    void list_userIdとscopeを同時に指定すると400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-both-params@example.com");

        mockMvc.perform(get("/api/posts").param("userId", "1").param("scope", "following").cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_scopeに不正な値を指定すると400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "list-invalid-scope@example.com");

        mockMvc.perform(get("/api/posts").param("scope", "invalid").cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_自分の投稿を編集できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "update-ok@example.com");
        var created = mockMvc.perform(createPostRequest("編集前").cookie(accessToken)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(updatePostRequest(postId, "編集後", List.of()).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("編集後"));
    }

    @Test
    void update_画像を追加できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "update-add-image@example.com");
        when(storageService.upload(eq("posts"), any())).thenReturn("https://example.com/posts/new.jpg");
        var created = mockMvc.perform(createPostRequest("編集前").cookie(accessToken)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(updatePostRequest(postId, "編集後", List.of(), jpegImage("new.jpg")).cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images.length()").value(1))
                .andExpect(jsonPath("$.images[0].imageUrl").value("https://example.com/posts/new.jpg"));
    }

    @Test
    void update_既存画像と新規枚数の合計が4枚を超えると400になる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "update-too-many-images@example.com");
        when(storageService.upload(eq("posts"), any())).thenReturn("https://example.com/posts/x.jpg");
        var created = mockMvc.perform(createPostRequest("編集前", jpegImage("1.jpg"), jpegImage("2.jpg"),
                        jpegImage("3.jpg"), jpegImage("4.jpg"))
                        .cookie(accessToken))
                .andReturn();
        var createdJson = objectMapper.readTree(created.getResponse().getContentAsString());
        int postId = createdJson.get("id").asInt();
        List<Long> keepImageIds = List.of(
                createdJson.get("images").get(0).get("id").asLong(),
                createdJson.get("images").get(1).get("id").asLong(),
                createdJson.get("images").get(2).get("id").asLong(),
                createdJson.get("images").get(3).get("id").asLong());

        mockMvc.perform(updatePostRequest(postId, "編集後", keepImageIds, jpegImage("new.jpg")).cookie(accessToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_他人の投稿を編集しようとすると403になる() throws Exception {
        Cookie ownerCookie = registerAndLogin("taro", "update-owner@example.com");
        var created = mockMvc.perform(createPostRequest("他人の投稿").cookie(ownerCookie)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        Cookie otherCookie = registerAndLogin("jiro", "update-other@example.com");

        mockMvc.perform(updatePostRequest(postId, "勝手に編集", List.of()).cookie(otherCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void delete_自分の投稿を削除できる() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "delete-ok@example.com");
        var created = mockMvc.perform(createPostRequest("削除される投稿").cookie(accessToken)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(delete("/api/posts/" + postId).cookie(accessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_画像付きの投稿でも削除できる() throws Exception {
        // post_imagesへのON DELETE CASCADE（V5マイグレーション）の回帰テスト。
        // CASCADEが無いと、画像が添付された投稿の削除はFK制約違反で失敗する。
        Cookie accessToken = registerAndLogin("taro", "delete-with-image@example.com");
        when(storageService.upload(eq("posts"), any())).thenReturn("https://example.com/posts/x.jpg");
        var created = mockMvc.perform(createPostRequest("削除される投稿", jpegImage("a.jpg")).cookie(accessToken))
                .andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(delete("/api/posts/" + postId).cookie(accessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_他人の投稿を削除しようとすると403になる() throws Exception {
        Cookie ownerCookie = registerAndLogin("taro", "delete-owner@example.com");
        var created = mockMvc.perform(createPostRequest("他人の投稿").cookie(ownerCookie)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        Cookie otherCookie = registerAndLogin("jiro", "delete-other@example.com");

        mockMvc.perform(delete("/api/posts/" + postId).cookie(otherCookie))
                .andExpect(status().isForbidden());
    }

    @Test
    void create_新規投稿はいいねコメント数0でlikedByMeがfalseで返る() throws Exception {
        Cookie accessToken = registerAndLogin("taro", "create-counts@example.com");

        mockMvc.perform(createPostRequest("投稿").cookie(accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.commentCount").value(0))
                .andExpect(jsonPath("$.likedByMe").value(false));
    }

    @Test
    void delete_いいね済みの投稿でも削除できる() throws Exception {
        // V4マイグレーション（likes.post_idへのON DELETE CASCADE追加）の回帰テスト。
        // CASCADEが無いと、いいねが付いた投稿の削除はFK制約違反で失敗する。
        Cookie accessToken = registerAndLogin("taro", "delete-with-like@example.com");
        var created = mockMvc.perform(createPostRequest("いいねされる投稿").cookie(accessToken)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        mockMvc.perform(post("/api/posts/" + postId + "/likes").cookie(accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/posts/" + postId).cookie(accessToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_コメント済みの投稿でも削除できる() throws Exception {
        // V4マイグレーション（comments.post_idへのON DELETE CASCADE追加）の回帰テスト。
        // CASCADEが無いと、コメントが付いた投稿の削除はFK制約違反で失敗する。
        Cookie accessToken = registerAndLogin("taro", "delete-with-comment@example.com");
        var created = mockMvc.perform(createPostRequest("コメントされる投稿").cookie(accessToken)).andReturn();
        int postId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();
        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .cookie(accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest("コメント"))))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/posts/" + postId).cookie(accessToken))
                .andExpect(status().isNoContent());
    }
}
