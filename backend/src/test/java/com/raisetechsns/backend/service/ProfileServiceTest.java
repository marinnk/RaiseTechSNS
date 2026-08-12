package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

import com.raisetechsns.backend.dto.ProfileResponse;
import com.raisetechsns.backend.dto.UpdateProfileRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.mapper.UserMapper;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private ProfileService profileService;

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private static UserWithStats row(long id, String bio, long followerCount, long followingCount,
            boolean followedByMe) {
        UserWithStats row = new UserWithStats();
        row.setId(id);
        row.setUsername("taro");
        row.setDisplayName("太郎");
        row.setBio(bio);
        row.setFollowerCount(followerCount);
        row.setFollowingCount(followingCount);
        row.setFollowedByMe(followedByMe);
        return row;
    }

    @Test
    void getProfile_本人のプロフィールならisOwnedByMeがtrueになる() {
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, "自己紹介", 2L, 3L, false)));

        ProfileResponse result = profileService.getProfile(1L, 1L);

        assertThat(result.isOwnedByMe()).isTrue();
        assertThat(result.bio()).isEqualTo("自己紹介");
        assertThat(result.followerCount()).isEqualTo(2L);
        assertThat(result.followingCount()).isEqualTo(3L);
    }

    @Test
    void getProfile_他人のプロフィールならisOwnedByMeがfalseになる() {
        when(userMapper.findByIdWithStats(2L, 1L)).thenReturn(Optional.of(row(2L, null, 0L, 0L, true)));

        ProfileResponse result = profileService.getProfile(2L, 1L);

        assertThat(result.isOwnedByMe()).isFalse();
        assertThat(result.followedByMe()).isTrue();
    }

    @Test
    void getProfile_存在しない利用者ならNOT_FOUNDになる() {
        when(userMapper.findByIdWithStats(999L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> profileService.getProfile(999L, 1L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void updateBio_自己紹介を更新できる() {
        User currentUser = user(1L);
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, "新しい自己紹介", 0L, 0L, false)));

        ProfileResponse result = profileService.updateBio(new UpdateProfileRequest("新しい自己紹介"), currentUser);

        verify(userMapper).updateBio(1L, "新しい自己紹介");
        assertThat(result.bio()).isEqualTo("新しい自己紹介");
    }

    @Test
    void requireUserExists_利用者が存在すれば何も起きない() {
        when(userMapper.findById(1L)).thenReturn(Optional.of(user(1L)));

        profileService.requireUserExists(1L);

        // 例外が発生しなければ成功（FollowServiceから共通で呼ばれる存在確認）
    }

    @Test
    void requireUserExists_利用者が存在しなければNOT_FOUNDになる() {
        when(userMapper.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> profileService.requireUserExists(999L));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
