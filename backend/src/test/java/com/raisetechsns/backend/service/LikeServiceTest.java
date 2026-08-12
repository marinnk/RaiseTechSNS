package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.LikeResponse;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.LikeMapper;
import com.raisetechsns.backend.mapper.PostMapper;

@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock
    private LikeMapper likeMapper;

    @Mock
    private PostMapper postMapper;

    // 投稿の存在確認はPostService.requirePostExistsに委譲している（CommentServiceTestと同じ理由）
    @Mock
    private PostService postService;

    @InjectMocks
    private LikeService likeService;

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private static PostWithAuthor row(long postId, long likeCount, boolean likedByMe) {
        PostWithAuthor row = new PostWithAuthor();
        row.setPostId(postId);
        row.setUserId(99L);
        row.setLikeCount(likeCount);
        row.setLikedByMe(likedByMe);
        return row;
    }

    @Test
    void like_投稿が存在すればいいねできる() {
        User currentUser = user(1L);
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 1L, true)));

        LikeResponse result = likeService.like(10L, currentUser);

        verify(likeMapper).insertIgnoreConflict(10L, 1L);
        assertThat(result.likeCount()).isEqualTo(1L);
        assertThat(result.likedByMe()).isTrue();
    }

    @Test
    void like_投稿が存在しなければNOT_FOUNDになる() {
        User currentUser = user(1L);
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"))
                .when(postService).requirePostExists(999L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> likeService.like(999L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(likeMapper, never()).insertIgnoreConflict(any(), any());
    }

    @Test
    void unlike_いいねを取り消せる() {
        User currentUser = user(1L);
        when(postMapper.findByIdWithAuthor(10L, 1L)).thenReturn(Optional.of(row(10L, 0L, false)));

        LikeResponse result = likeService.unlike(10L, currentUser);

        verify(likeMapper).delete(10L, 1L);
        assertThat(result.likeCount()).isEqualTo(0L);
        assertThat(result.likedByMe()).isFalse();
    }

    @Test
    void unlike_投稿が存在しなければNOT_FOUNDになる() {
        User currentUser = user(1L);
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"))
                .when(postService).requirePostExists(999L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> likeService.unlike(999L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
