package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

import com.raisetechsns.backend.dto.FollowActionResponse;
import com.raisetechsns.backend.dto.FollowListResponse;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserFollowSummary;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.mapper.FollowMapper;
import com.raisetechsns.backend.mapper.UserMapper;

@ExtendWith(MockitoExtension.class)
class FollowServiceTest {

    @Mock
    private FollowMapper followMapper;

    @Mock
    private UserMapper userMapper;

    // 利用者の存在確認はProfileService.requireUserExistsに委譲している
    @Mock
    private ProfileService profileService;

    @InjectMocks
    private FollowService followService;

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private static UserWithStats row(long id, long followerCount, boolean followedByMe) {
        UserWithStats row = new UserWithStats();
        row.setId(id);
        row.setFollowerCount(followerCount);
        row.setFollowedByMe(followedByMe);
        return row;
    }

    private static UserFollowSummary summary(long id) {
        UserFollowSummary summary = new UserFollowSummary();
        summary.setId(id);
        summary.setUsername("jiro");
        summary.setDisplayName("次郎");
        return summary;
    }

    @Test
    void follow_対象利用者が存在すればフォローできる() {
        User currentUser = user(1L);
        when(userMapper.findByIdWithStats(2L, 1L)).thenReturn(Optional.of(row(2L, 1L, true)));

        FollowActionResponse result = followService.follow(2L, currentUser);

        verify(followMapper).insertIgnoreConflict(1L, 2L);
        assertThat(result.followedByMe()).isTrue();
        assertThat(result.followerCount()).isEqualTo(1L);
    }

    @Test
    void follow_自分自身を指定するとBAD_REQUESTになる() {
        User currentUser = user(1L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> followService.follow(1L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verify(followMapper, never()).insertIgnoreConflict(any(), any());
    }

    @Test
    void follow_対象利用者が存在しなければNOT_FOUNDになる() {
        User currentUser = user(1L);
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"))
                .when(profileService).requireUserExists(999L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> followService.follow(999L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(followMapper, never()).insertIgnoreConflict(any(), any());
    }

    @Test
    void unfollow_フォローを解除できる() {
        User currentUser = user(1L);
        when(userMapper.findByIdWithStats(2L, 1L)).thenReturn(Optional.of(row(2L, 0L, false)));

        FollowActionResponse result = followService.unfollow(2L, currentUser);

        verify(followMapper).delete(1L, 2L);
        assertThat(result.followedByMe()).isFalse();
        assertThat(result.followerCount()).isEqualTo(0L);
    }

    @Test
    void unfollow_対象利用者が存在しなければNOT_FOUNDになる() {
        // unfollowはfollowと違い事前のrequireUserExistsを行わない（DELETEは対象が無くても
        // 安全なため）。currentStateのfindByIdWithStatsが存在しないことを検知して404にする
        User currentUser = user(1L);
        when(userMapper.findByIdWithStats(999L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> followService.unfollow(999L, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listFollowers_フォロワー一覧を取得できる() {
        when(followMapper.findFollowers(1L, 1L)).thenReturn(List.of(summary(2L)));

        FollowListResponse result = followService.listFollowers(1L, 1L);

        assertThat(result.users()).extracting(u -> u.id()).containsExactly(2L);
    }

    @Test
    void listFollowers_対象利用者が存在しなければNOT_FOUNDになる() {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"))
                .when(profileService).requireUserExists(999L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> followService.listFollowers(999L, 1L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listFollowing_フォロー中一覧を取得できる() {
        when(followMapper.findFollowing(1L, 1L)).thenReturn(List.of(summary(3L)));

        FollowListResponse result = followService.listFollowing(1L, 1L);

        assertThat(result.users()).extracting(u -> u.id()).containsExactly(3L);
    }

    @Test
    void listFollowing_対象利用者が存在しなければNOT_FOUNDになる() {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"))
                .when(profileService).requireUserExists(999L);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> followService.listFollowing(999L, 1L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
