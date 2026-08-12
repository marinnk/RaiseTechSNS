package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.PostListResponse;
import com.raisetechsns.backend.dto.PostResponse;
import com.raisetechsns.backend.dto.UpdatePostRequest;
import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.PostMapper;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostMapper postMapper;

    @InjectMocks
    private PostService postService;

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("taro");
        user.setDisplayName("太郎");
        return user;
    }

    private static PostWithAuthor row(long postId, long userId, String content) {
        PostWithAuthor row = new PostWithAuthor();
        row.setPostId(postId);
        row.setUserId(userId);
        row.setContent(content);
        row.setCreatedAt(OffsetDateTime.now());
        row.setUpdatedAt(OffsetDateTime.now());
        row.setUsername("taro");
        row.setDisplayName("太郎");
        return row;
    }

    private static Post post(long id, long userId) {
        Post post = new Post();
        post.setId(id);
        post.setUserId(userId);
        post.setContent("元の投稿");
        return post;
    }

    @Test
    void create_有効な内容なら投稿を作成できる() {
        User currentUser = user(1L);
        doAnswer(invocation -> {
            Post inserted = invocation.getArgument(0);
            inserted.setId(10L);
            return null;
        }).when(postMapper).insert(any(Post.class));
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 1L, "こんにちは")));

        PostResponse result = postService.create(new CreatePostRequest("こんにちは"), currentUser);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.content()).isEqualTo("こんにちは");
        assertThat(result.isOwnedByMe()).isTrue();
    }

    @Test
    void list_limit1件を超えて取得できた場合hasMoreがtrueになる() {
        // デフォルトlimit(20)なので、Mapperにはlimit+1=21件のリクエストが渡り、
        // ここでは21件返る（＝ページ超過あり）ケースを検証する
        List<PostWithAuthor> rows = java.util.stream.IntStream.rangeClosed(1, 21)
                .mapToObj(i -> row(i, 1L, "post" + i))
                .toList();
        when(postMapper.findAllWithAuthor(eq(21), isNull(), eq(1L))).thenReturn(rows);

        PostListResponse result = postService.list(null, null, null, 1L);

        assertThat(result.hasMore()).isTrue();
        assertThat(result.posts()).hasSize(20);
    }

    @Test
    void list_limit以下の件数ならhasMoreがfalseになる() {
        when(postMapper.findAllWithAuthor(eq(21), isNull(), eq(1L)))
                .thenReturn(List.of(row(2L, 1L, "b"), row(1L, 1L, "a")));

        PostListResponse result = postService.list(null, null, null, 1L);

        assertThat(result.hasMore()).isFalse();
        assertThat(result.posts()).hasSize(2);
    }

    @Test
    void list_beforeIdとafterIdを同時に指定するとBAD_REQUESTになる() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> postService.list(20, 5L, 3L, 1L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void list_afterId指定時はfindNewerWithAuthorの結果を新しい順に並べ替えて返す() {
        // findNewerWithAuthorは古い順（id昇順）で返す想定。レスポンスは他の一覧と同じく新しい順にする
        when(postMapper.findNewerWithAuthor(eq(1L), eq(20), eq(1L)))
                .thenReturn(List.of(row(2L, 1L, "2番目に古い新着"), row(3L, 1L, "最新の新着")));

        PostListResponse result = postService.list(null, null, 1L, 1L);

        assertThat(result.posts()).extracting(PostResponse::id).containsExactly(3L, 2L);
        assertThat(result.hasMore()).isFalse();
    }

    @Test
    void list_afterId指定時はlimitを超えて取りこぼさないようfindNewerWithAuthorへ古い順の取得を委ねる() {
        // 1回のポーリング間隔でlimitを超える新着があっても、新しい方だけを返して
        // 間の投稿を永久に取りこぼすことがないよう、Serviceはfindmapper側の古い順の結果を
        // そのまま（並べ替えのみ）使う。つまりMapperにlimit+1件を要求する等の“打ち切り”を行わない
        when(postMapper.findNewerWithAuthor(eq(1L), eq(2), eq(1L)))
                .thenReturn(List.of(row(2L, 1L, "取りこぼされてはいけない投稿"), row(3L, 1L, "その次に古い新着")));

        PostListResponse result = postService.list(2, null, 1L, 1L);

        assertThat(result.posts()).extracting(PostResponse::content)
                .containsExactly("その次に古い新着", "取りこぼされてはいけない投稿");
    }

    @Test
    void update_自分の投稿なら更新できる() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        when(postMapper.update(10L, 1L, "更新後")).thenReturn(1);
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 1L, "更新後")));

        PostResponse result = postService.update(10L, new UpdatePostRequest("更新後"), currentUser);

        assertThat(result.content()).isEqualTo("更新後");
    }

    @Test
    void update_他人の投稿ならFORBIDDENになる() {
        User currentUser = user(2L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.update(10L, new UpdatePostRequest("更新後"), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void update_存在しない投稿ならNOT_FOUNDになる() {
        User currentUser = user(1L);
        when(postMapper.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.update(999L, new UpdatePostRequest("更新後"), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void delete_自分の投稿なら削除できる() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        when(postMapper.delete(10L, 1L)).thenReturn(1);

        postService.delete(10L, currentUser);

        // 例外が発生しなければ成功
    }

    @Test
    void delete_他人の投稿ならFORBIDDENになる() {
        User currentUser = user(2L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> postService.delete(10L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void delete_存在しない投稿ならNOT_FOUNDになる() {
        User currentUser = user(1L);
        when(postMapper.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> postService.delete(999L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
