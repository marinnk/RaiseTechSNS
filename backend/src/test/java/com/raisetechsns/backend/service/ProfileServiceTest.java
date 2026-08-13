package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.ProfileResponse;
import com.raisetechsns.backend.dto.UpdateProfileRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.mapper.UserMapper;
import com.raisetechsns.backend.storage.StorageService;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private ProfileService profileService;

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private static User user(long id, String avatarUrl) {
        User user = user(id);
        user.setAvatarUrl(avatarUrl);
        return user;
    }

    private static MultipartFile jpegFile(String name, byte[] content) {
        return new MockMultipartFile("file", name, "image/jpeg", content);
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
    void uploadAvatar_新しい画像をアップロードするとavatarUrlが更新される() {
        User currentUser = user(1L);
        when(userMapper.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, null)));
        when(storageService.upload(eq("avatars"), any())).thenReturn("https://example.com/avatars/new.jpg");
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, null, 0L, 0L, false)));

        profileService.uploadAvatar(jpegFile("avatar.jpg", new byte[100]), currentUser);

        verify(userMapper).updateAvatarUrl(1L, "https://example.com/avatars/new.jpg");
    }

    @Test
    void uploadAvatar_既存の画像がある場合は古い画像を削除する() {
        User currentUser = user(1L);
        when(userMapper.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, "https://example.com/avatars/old.jpg")));
        when(storageService.upload(eq("avatars"), any())).thenReturn("https://example.com/avatars/new.jpg");
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, null, 0L, 0L, false)));

        profileService.uploadAvatar(jpegFile("avatar.jpg", new byte[100]), currentUser);

        verify(storageService).delete("https://example.com/avatars/old.jpg");
    }

    @Test
    void uploadAvatar_トランザクション中は古い画像の削除をコミット後まで遅らせる() {
        // uploadAvatarは@Transactionalの中でDB更新とS3削除の両方を行う。DB更新はメソッドが
        // 正常終了してトランザクションがコミットされるまで確定しないため、S3の削除もコミット後
        // （afterCommit）まで遅らせる必要がある（品質チェックで判明した不具合の再発防止用テスト）。
        User currentUser = user(1L);
        when(userMapper.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, "https://example.com/avatars/old.jpg")));
        when(storageService.upload(eq("avatars"), any())).thenReturn("https://example.com/avatars/new.jpg");
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, null, 0L, 0L, false)));

        TransactionSynchronizationManager.initSynchronization();
        try {
            profileService.uploadAvatar(jpegFile("avatar.jpg", new byte[100]), currentUser);

            // コミット前（メソッドが返ってきた直後）は、まだ古い画像を削除していないはず
            verify(storageService, never()).delete(any());

            // コミットが起きて初めて削除される
            for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
                synchronization.afterCommit();
            }
            verify(storageService).delete("https://example.com/avatars/old.jpg");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void uploadAvatar_既存の画像が無い場合はdeleteを呼ばない() {
        User currentUser = user(1L);
        when(userMapper.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, null)));
        when(storageService.upload(eq("avatars"), any())).thenReturn("https://example.com/avatars/new.jpg");
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, null, 0L, 0L, false)));

        profileService.uploadAvatar(jpegFile("avatar.jpg", new byte[100]), currentUser);

        verify(storageService, never()).delete(any());
    }

    @Test
    void uploadAvatar_形式が不正な場合はBAD_REQUESTになる() {
        User currentUser = user(1L);
        MultipartFile textFile = new MockMultipartFile("file", "note.txt", "text/plain", new byte[10]);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> profileService.uploadAvatar(textFile, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void uploadAvatar_5MBを超える場合はBAD_REQUESTになる() {
        User currentUser = user(1L);
        MultipartFile tooLarge = jpegFile("avatar.jpg", new byte[6 * 1024 * 1024]);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> profileService.uploadAvatar(tooLarge, currentUser));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void deleteAvatar_画像がある場合は削除してavatarUrlをnullにする() {
        User currentUser = user(1L);
        when(userMapper.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, "https://example.com/avatars/old.jpg")));
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, null, 0L, 0L, false)));

        profileService.deleteAvatar(currentUser);

        verify(storageService).delete("https://example.com/avatars/old.jpg");
        verify(userMapper).updateAvatarUrl(1L, null);
    }

    @Test
    void deleteAvatar_画像が無い場合も冪等に成功する() {
        User currentUser = user(1L);
        when(userMapper.findByIdForUpdate(1L)).thenReturn(Optional.of(user(1L, null)));
        when(userMapper.findByIdWithStats(1L, 1L)).thenReturn(Optional.of(row(1L, null, 0L, 0L, false)));

        profileService.deleteAvatar(currentUser);

        verify(storageService, never()).delete(any());
        verify(userMapper, never()).updateAvatarUrl(any(), any());
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
