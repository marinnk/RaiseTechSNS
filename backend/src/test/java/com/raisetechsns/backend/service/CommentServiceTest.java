package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CommentListResponse;
import com.raisetechsns.backend.dto.CommentResponse;
import com.raisetechsns.backend.dto.CreateCommentRequest;
import com.raisetechsns.backend.entity.Comment;
import com.raisetechsns.backend.entity.CommentWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.CommentMapper;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentMapper commentMapper;

    // 投稿の存在確認はPostService.requirePostExistsに委譲しているため、CommentMapper/PostMapperではなく
    // PostServiceをモックする。成功系のテストではrequirePostExistsは何もしない（デフォルトのvoidモック動作）ため
    // 明示的なスタブは不要で、失敗系のみdoThrowでNOT_FOUNDを起こす
    @Mock
    private PostService postService;

    @InjectMocks
    private CommentService commentService;

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("taro");
        user.setDisplayName("太郎");
        return user;
    }

    private static CommentWithAuthor row(long commentId, long postId, long userId, String content) {
        CommentWithAuthor row = new CommentWithAuthor();
        row.setCommentId(commentId);
        row.setPostId(postId);
        row.setUserId(userId);
        row.setContent(content);
        row.setUsername("taro");
        row.setDisplayName("太郎");
        row.setAvatarUrl("https://example.com/avatars/taro.jpg");
        return row;
    }

    private static Comment comment(long id, long postId, long userId) {
        Comment comment = new Comment();
        comment.setId(id);
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent("コメント");
        return comment;
    }

    @Test
    void list_投稿が存在すればコメント一覧を古い順で取得できる() {
        when(commentMapper.findAllWithAuthorByPostId(1L))
                .thenReturn(List.of(row(10L, 1L, 2L, "最初のコメント"), row(11L, 1L, 2L, "次のコメント")));

        CommentListResponse result = commentService.list(1L, 2L);

        assertThat(result.comments()).extracting(CommentResponse::content)
                .containsExactly("最初のコメント", "次のコメント");
        assertThat(result.comments().get(0).isOwnedByMe()).isTrue();
    }

    @Test
    void list_投稿が存在しなければNOT_FOUNDになる() {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"))
                .when(postService).requirePostExists(999L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> commentService.list(999L, 1L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void create_有効な内容ならコメントを作成できる() {
        User currentUser = user(2L);
        doAnswer(invocation -> {
            Comment inserted = invocation.getArgument(0);
            inserted.setId(10L);
            return null;
        }).when(commentMapper).insert(any(Comment.class));
        when(commentMapper.findByIdWithAuthor(10L)).thenReturn(Optional.of(row(10L, 1L, 2L, "こんにちは")));

        CommentResponse result = commentService.create(1L, new CreateCommentRequest("こんにちは"), currentUser);

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.content()).isEqualTo("こんにちは");
        assertThat(result.isOwnedByMe()).isTrue();
        assertThat(result.avatarUrl()).isEqualTo("https://example.com/avatars/taro.jpg");
    }

    @Test
    void create_投稿が存在しなければNOT_FOUNDになる() {
        User currentUser = user(2L);
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"))
                .when(postService).requirePostExists(999L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> commentService.create(999L, new CreateCommentRequest("こんにちは"), currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void delete_自分のコメントなら削除できる() {
        User currentUser = user(2L);
        when(commentMapper.findById(10L)).thenReturn(Optional.of(comment(10L, 1L, 2L)));
        when(commentMapper.delete(10L, 2L)).thenReturn(1);

        commentService.delete(10L, currentUser);

        // 例外が発生しなければ成功
    }

    @Test
    void delete_他人のコメントならFORBIDDENになる() {
        User currentUser = user(3L);
        when(commentMapper.findById(10L)).thenReturn(Optional.of(comment(10L, 1L, 2L)));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> commentService.delete(10L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void delete_存在しないコメントならNOT_FOUNDになる() {
        User currentUser = user(2L);
        when(commentMapper.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> commentService.delete(999L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
