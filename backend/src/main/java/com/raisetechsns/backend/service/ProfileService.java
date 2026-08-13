package com.raisetechsns.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.ProfileResponse;
import com.raisetechsns.backend.dto.UpdateProfileRequest;
import com.raisetechsns.backend.dto.UserSummaryResponse;
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
     * <p>{@code findByIdForUpdate}で行ロックを取得してから読み書きする。ロックを取らないと、
     * 同一利用者に対する2つのアップロード（例：複数タブでの操作）がほぼ同時に走った場合、
     * 両方が同じ「今の画像」を読んでしまい、後勝ちのDB更新で上書きされた方のアップロード画像が
     * どのavatar_urlからも参照されずS3に残り続ける（孤立する）。行ロックにより、片方の
     * トランザクションが完了するまでもう片方を待たせることで、後から実行される方は先に更新された
     * 後のURLを「今の画像」として読み、それを削除対象にできる。
     *
     * <p>S3からの削除は、DBの更新が実際にコミットされた後（{@code afterCommit}）に行う。
     * このメソッド全体が1つの{@code @Transactional}であるため、途中でS3を削除してしまうと、
     * その後の処理が失敗してトランザクションがロールバックされた場合に、avatar_urlが指す画像が
     * 既に消えている状態になりかねない。コミット後に削除することで、削除するのは
     * ロールバックが起きえない「確定した古い画像」だけになる。
     */
    @Transactional
    public ProfileResponse uploadAvatar(MultipartFile file, User currentUser) {
        ImageValidation.validate(file);
        User existing = userMapper.findByIdForUpdate(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        String newAvatarUrl = storageService.upload(AVATAR_FOLDER, file);
        userMapper.updateAvatarUrl(currentUser.getId(), newAvatarUrl);
        storageService.deleteAfterCommit(existing.getAvatarUrl());
        return getProfile(currentUser.getId(), currentUser.getId());
    }

    /**
     * 自分のアバター画像を削除する。既に未設定の場合もエラーにせず、現在の状態をそのまま返す（冪等）。
     * 行ロック・コミット後削除の理由は{@link #uploadAvatar}と同じ。
     */
    @Transactional
    public ProfileResponse deleteAvatar(User currentUser) {
        User existing = userMapper.findByIdForUpdate(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        if (existing.getAvatarUrl() != null) {
            userMapper.updateAvatarUrl(currentUser.getId(), null);
            storageService.deleteAfterCommit(existing.getAvatarUrl());
        }
        return getProfile(currentUser.getId(), currentUser.getId());
    }

    /**
     * ユーザー名・表示名の部分一致でユーザーを検索する（F-8 ユーザー検索機能）。
     *
     * @throws ResponseStatusException キーワードが空文字（trim後）の場合（400）。UC09の
     *     「キーワードが未入力の場合は検索を実行しない」はフロントエンド側で防ぐのが基本だが、
     *     直接APIを叩かれた場合の安全側の措置として、バックエンドでも空文字は拒否する。
     */
    public List<UserSummaryResponse> searchUsers(String keyword, Long currentUserId) {
        String trimmed = keyword == null ? "" : keyword.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "keyword must not be blank");
        }
        return userMapper.searchByKeyword(trimmed, currentUserId).stream()
                .map(UserSummaryResponse::from)
                .toList();
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
