package com.raisetechsns.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.ProfileResponse;
import com.raisetechsns.backend.dto.UpdateProfileRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.mapper.UserMapper;

@Service
public class ProfileService {

    private final UserMapper userMapper;

    public ProfileService(UserMapper userMapper) {
        this.userMapper = userMapper;
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
     * 自分の自己紹介を更新する。今バージョンでは自己紹介のみ編集対象（アイコン画像は対象外）。
     */
    @Transactional
    public ProfileResponse updateBio(UpdateProfileRequest request, User currentUser) {
        userMapper.updateBio(currentUser.getId(), request.bio());
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
