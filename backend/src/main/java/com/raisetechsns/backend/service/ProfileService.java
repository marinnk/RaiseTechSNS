package com.raisetechsns.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.ProfileResponse;
import com.raisetechsns.backend.dto.UpdateProfileRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.mapper.UserMapper;
import com.raisetechsns.backend.storage.StorageService;
import com.raisetechsns.backend.validation.ImageValidation;

@Service
public class ProfileService {

    private static final String AVATAR_FOLDER = "avatars";

    private final UserMapper userMapper;
    private final StorageService storageService;

    public ProfileService(UserMapper userMapper, StorageService storageService) {
        this.userMapper = userMapper;
        this.storageService = storageService;
    }

    /**
     * 指定した利用者のプロフィールを取得する。
     */
    public ProfileResponse getProfile(Long userId, Long currentUserId) {
        UserWithStats row = userMapper.findByIdWithStats(userId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        return ProfileResponse.from(row, currentUserId);
    }

    /**
     * 自分の自己紹介を更新する。
     */
    @Transactional
    public ProfileResponse updateBio(UpdateProfileRequest request, User currentUser) {
        userMapper.updateBio(currentUser.getId(), request.bio());
        return getProfile(currentUser.getId(), currentUser.getId());
    }

    /**
     * 自分のアバター画像を登録・上書きする。
     *
     * <p>先にS3へ新しい画像をアップロードしてからDBを更新し、その後に古い画像をS3から削除する。
     * この順序にしているのは、「DB更新は成功したがS3削除で失敗した」場合でもavatar_urlは正しい
     * 新しい値のまま保たれ、孤立するのは古いS3オブジェクトだけで済むようにするため（逆順だと、
     * S3削除に成功した直後にDB更新が失敗すると、avatar_urlが指す画像が消えてしまう）。
     */
    @Transactional
    public ProfileResponse uploadAvatar(MultipartFile file, User currentUser) {
        ImageValidation.validate(file);
        User existing = userMapper.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        String newAvatarUrl = storageService.upload(AVATAR_FOLDER, file);
        userMapper.updateAvatarUrl(currentUser.getId(), newAvatarUrl);
        if (existing.getAvatarUrl() != null) {
            storageService.delete(existing.getAvatarUrl());
        }
        return getProfile(currentUser.getId(), currentUser.getId());
    }

    /**
     * 自分のアバター画像を削除する。既に未設定の場合もエラーにせず、現在の状態をそのまま返す（冪等）。
     */
    @Transactional
    public ProfileResponse deleteAvatar(User currentUser) {
        User existing = userMapper.findById(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        if (existing.getAvatarUrl() != null) {
            storageService.delete(existing.getAvatarUrl());
            userMapper.updateAvatarUrl(currentUser.getId(), null);
        }
        return getProfile(currentUser.getId(), currentUser.getId());
    }

    /**
     * 利用者の存在確認だけを行う。{@link PostService#requirePostExists}と同じ役割で、
     * フォロー機能など、利用者の存在を前提とする他サービスから呼ばれる共通の入口。
     *
     * @throws ResponseStatusException 利用者が存在しない場合（404）
     */
    public void requireUserExists(Long userId) {
        userMapper.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
    }
}
