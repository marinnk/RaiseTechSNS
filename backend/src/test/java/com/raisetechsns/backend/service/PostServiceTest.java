package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.PostListResponse;
import com.raisetechsns.backend.dto.PostResponse;
import com.raisetechsns.backend.dto.UpdatePostRequest;
import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.PostImage;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.PostImageMapper;
import com.raisetechsns.backend.mapper.PostMapper;
import com.raisetechsns.backend.storage.StorageService;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostMapper postMapper;

    @Mock
    private PostImageMapper postImageMapper;

    // deleteAfterCommitはStorageServiceのdefaultメソッドのため、Mockitoの通常のモックだと
    // 本体が実行されず素通りしてしまう。CALLS_REAL_METHODSにより、defaultメソッド（deleteAfterCommit）
    // は実際のロジックを実行しつつ、抽象メソッド（upload・delete）は通常通りスタブ・検証できる
    @Mock(answer = Answers.CALLS_REAL_METHODS)
    private StorageService storageService;

    @InjectMocks
    private PostService postService;

    @BeforeEach
    void setUp() {
        // 画像を扱わないテストの大半で必要になる「画像は無い」という既定のスタブ
        lenient().when(postImageMapper.findByPostId(anyLong())).thenReturn(List.of());
        lenient().when(postImageMapper.findByPostIds(any())).thenReturn(List.of());
    }

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
        row.setAvatarUrl("https://example.com/avatars/taro.jpg");
        return row;
    }

    private static Post post(long id, long userId) {
        Post post = new Post();
        post.setId(id);
        post.setUserId(userId);
        post.setContent("元の投稿");
        return post;
    }

    private static PostImage postImage(long id, long postId, String imageUrl, int displayOrder) {
        PostImage image = new PostImage();
        image.setId(id);
        image.setPostId(postId);
        image.setImageUrl(imageUrl);
        image.setDisplayOrder(displayOrder);
        return image;
    }

    private static MultipartFile jpegFile(String name) {
        return new MockMultipartFile("images", name, "image/jpeg", new byte[10]);
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

        PostResponse result = postService.create(new CreatePostRequest("こんにちは"), List.of(), currentUser);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.content()).isEqualTo("こんにちは");
        assertThat(result.isOwnedByMe()).isTrue();
        assertThat(result.avatarUrl()).isEqualTo("https://example.com/avatars/taro.jpg");
        assertThat(result.images()).isEmpty();
    }

    @Test
    void create_画像を添付すると表示順で保存されレスポンスに含まれる() {
        User currentUser = user(1L);
        doAnswer(invocation -> {
            Post inserted = invocation.getArgument(0);
            inserted.setId(10L);
            return null;
        }).when(postMapper).insert(any(Post.class));
        MultipartFile image1 = jpegFile("a.jpg");
        MultipartFile image2 = jpegFile("b.jpg");
        when(storageService.upload("posts", image1)).thenReturn("https://example.com/posts/a.jpg");
        when(storageService.upload("posts", image2)).thenReturn("https://example.com/posts/b.jpg");
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 1L, "画像付き投稿")));
        when(postImageMapper.findByPostId(10L)).thenReturn(List.of(
                postImage(1L, 10L, "https://example.com/posts/a.jpg", 0),
                postImage(2L, 10L, "https://example.com/posts/b.jpg", 1)));

        PostResponse result = postService.create(new CreatePostRequest("画像付き投稿"), List.of(image1, image2), currentUser);

        verify(postImageMapper).insert(10L, "https://example.com/posts/a.jpg", 0);
        verify(postImageMapper).insert(10L, "https://example.com/posts/b.jpg", 1);
        assertThat(result.images()).hasSize(2);
        assertThat(result.images().get(0).imageUrl()).isEqualTo("https://example.com/posts/a.jpg");
        assertThat(result.images().get(1).imageUrl()).isEqualTo("https://example.com/posts/b.jpg");
    }

    @Test
    void create_画像が4枚を超えるとBAD_REQUESTになりアップロードしない() {
        User currentUser = user(1L);
        List<MultipartFile> images = List.of(
                jpegFile("1.jpg"), jpegFile("2.jpg"), jpegFile("3.jpg"), jpegFile("4.jpg"), jpegFile("5.jpg"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.create(new CreatePostRequest("投稿"), images, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(storageService, never()).upload(any(), any());
        verify(postMapper, never()).insert(any());
    }

    @Test
    void create_不正な形式の画像ならBAD_REQUESTになる() {
        User currentUser = user(1L);
        MultipartFile textFile = new MockMultipartFile("images", "note.txt", "text/plain", new byte[10]);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.create(new CreatePostRequest("投稿"), List.of(textFile), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(postMapper, never()).insert(any());
    }

    @Test
    void list_limit1件を超えて取得できた場合hasMoreがtrueになる() {
        // デフォルトlimit(20)なので、Mapperにはlimit+1=21件のリクエストが渡り、
        // ここでは21件返る（＝ページ超過あり）ケースを検証する
        List<PostWithAuthor> rows = java.util.stream.IntStream.rangeClosed(1, 21)
                .mapToObj(i -> row(i, 1L, "post" + i))
                .toList();
        when(postMapper.findAllWithAuthor(eq(21), isNull(), eq(1L), isNull(), eq(false))).thenReturn(rows);

        PostListResponse result = postService.list(null, null, null, 1L, null, false);

        assertThat(result.hasMore()).isTrue();
        assertThat(result.posts()).hasSize(20);
    }

    @Test
    void list_limit以下の件数ならhasMoreがfalseになる() {
        when(postMapper.findAllWithAuthor(eq(21), isNull(), eq(1L), isNull(), eq(false)))
                .thenReturn(List.of(row(2L, 1L, "b"), row(1L, 1L, "a")));

        PostListResponse result = postService.list(null, null, null, 1L, null, false);

        assertThat(result.hasMore()).isFalse();
        assertThat(result.posts()).hasSize(2);
    }

    @Test
    void list_beforeIdとafterIdを同時に指定するとBAD_REQUESTになる() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> postService.list(20, 5L, 3L, 1L, null, false));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void list_userIdとscope指定を同時に指定するとBAD_REQUESTになる() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> postService.list(20, null, null, 1L, 5L, true));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void list_userIdを指定すると指定した利用者の投稿のみをMapperへ要求する() {
        when(postMapper.findAllWithAuthor(eq(21), isNull(), eq(1L), eq(5L), eq(false)))
                .thenReturn(List.of(row(1L, 5L, "5番の投稿")));

        PostListResponse result = postService.list(null, null, null, 1L, 5L, false);

        assertThat(result.posts()).extracting(PostResponse::userId).containsExactly(5L);
    }

    @Test
    void list_scopeがfollowingならfollowingOnly指定でMapperへ要求する() {
        when(postMapper.findAllWithAuthor(eq(21), isNull(), eq(1L), isNull(), eq(true)))
                .thenReturn(List.of(row(1L, 1L, "自分の投稿")));

        PostListResponse result = postService.list(null, null, null, 1L, null, true);

        assertThat(result.posts()).hasSize(1);
    }

    @Test
    void list_afterId指定時はfindNewerWithAuthorの結果を新しい順に並べ替えて返す() {
        // findNewerWithAuthorは古い順（id昇順）で返す想定。レスポンスは他の一覧と同じく新しい順にする
        when(postMapper.findNewerWithAuthor(eq(1L), eq(20), eq(1L), isNull(), eq(false)))
                .thenReturn(List.of(row(2L, 1L, "2番目に古い新着"), row(3L, 1L, "最新の新着")));

        PostListResponse result = postService.list(null, null, 1L, 1L, null, false);

        assertThat(result.posts()).extracting(PostResponse::id).containsExactly(3L, 2L);
        assertThat(result.hasMore()).isFalse();
    }

    @Test
    void list_afterId指定時はlimitを超えて取りこぼさないようfindNewerWithAuthorへ古い順の取得を委ねる() {
        // 1回のポーリング間隔でlimitを超える新着があっても、新しい方だけを返して
        // 間の投稿を永久に取りこぼすことがないよう、Serviceはfindmapper側の古い順の結果を
        // そのまま（並べ替えのみ）使う。つまりMapperにlimit+1件を要求する等の“打ち切り”を行わない
        when(postMapper.findNewerWithAuthor(eq(1L), eq(2), eq(1L), isNull(), eq(false)))
                .thenReturn(List.of(row(2L, 1L, "取りこぼされてはいけない投稿"), row(3L, 1L, "その次に古い新着")));

        PostListResponse result = postService.list(2, null, 1L, 1L, null, false);

        assertThat(result.posts()).extracting(PostResponse::content)
                .containsExactly("その次に古い新着", "取りこぼされてはいけない投稿");
    }

    @Test
    void update_自分の投稿なら更新できる() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        when(postMapper.update(10L, 1L, "更新後")).thenReturn(1);
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 1L, "更新後")));

        PostResponse result = postService.update(
                10L, new UpdatePostRequest("更新後", List.of()), List.of(), currentUser);

        assertThat(result.content()).isEqualTo("更新後");
    }

    @Test
    void update_他人の投稿ならFORBIDDENになる() {
        User currentUser = user(2L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.update(10L, new UpdatePostRequest("更新後", List.of()), List.of(), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void update_存在しない投稿ならNOT_FOUNDになる() {
        User currentUser = user(1L);
        when(postMapper.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.update(999L, new UpdatePostRequest("更新後", List.of()), List.of(), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void update_keepImageIdsに存在しないidが含まれるとBAD_REQUESTになる() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        when(postImageMapper.findByPostId(10L))
                .thenReturn(List.of(postImage(1L, 10L, "https://example.com/posts/a.jpg", 0)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.update(
                        10L, new UpdatePostRequest("更新後", List.of(999L)), List.of(), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void update_残す枚数と新規枚数の合計が4枚を超えるとBAD_REQUESTになる() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        List<PostImage> existing = List.of(
                postImage(1L, 10L, "url1", 0), postImage(2L, 10L, "url2", 1),
                postImage(3L, 10L, "url3", 2), postImage(4L, 10L, "url4", 3));
        when(postImageMapper.findByPostId(10L)).thenReturn(existing);
        List<Long> keepAll = List.of(1L, 2L, 3L, 4L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.update(
                        10L, new UpdatePostRequest("更新後", keepAll), List.of(jpegFile("new.jpg")), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void update_残さなかった既存画像は削除される() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        when(postMapper.update(10L, 1L, "更新後")).thenReturn(1);
        PostImage kept = postImage(1L, 10L, "https://example.com/posts/keep.jpg", 0);
        PostImage removed = postImage(2L, 10L, "https://example.com/posts/removed.jpg", 1);
        when(postImageMapper.findByPostId(10L)).thenReturn(List.of(kept, removed));
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 1L, "更新後")));

        postService.update(10L, new UpdatePostRequest("更新後", List.of(1L)), List.of(), currentUser);

        verify(postImageMapper).insert(10L, "https://example.com/posts/keep.jpg", 0);
        verify(storageService).delete("https://example.com/posts/removed.jpg");
        verify(storageService, never()).delete("https://example.com/posts/keep.jpg");
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

    @Test
    void delete_投稿を削除すると添付画像も削除される() {
        User currentUser = user(1L);
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));
        when(postImageMapper.findByPostId(10L))
                .thenReturn(List.of(postImage(1L, 10L, "https://example.com/posts/a.jpg", 0)));
        when(postMapper.delete(10L, 1L)).thenReturn(1);

        postService.delete(10L, currentUser);

        verify(storageService).delete("https://example.com/posts/a.jpg");
    }

    @Test
    void requirePostExists_投稿が存在すれば何も起きない() {
        when(postMapper.findById(10L)).thenReturn(Optional.of(post(10L, 1L)));

        postService.requirePostExists(10L);

        // 例外が発生しなければ成功（CommentService・LikeServiceから共通で呼ばれる存在確認）
    }

    @Test
    void requirePostExists_投稿が存在しなければNOT_FOUNDになる() {
        when(postMapper.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> postService.requirePostExists(999L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
