package com.raisetechsns.backend.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.FollowActionResponse;
import com.raisetechsns.backend.dto.FollowListResponse;
import com.raisetechsns.backend.dto.UserSummaryResponse;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.mapper.FollowMapper;
import com.raisetechsns.backend.mapper.UserMapper;

@Service
public class FollowService {

    private final FollowMapper followMapper;
    private final UserMapper userMapper;
    private final ProfileService profileService;

    public FollowService(FollowMapper followMapper, UserMapper userMapper, ProfileService profileService) {
        this.followMapper = followMapper;
        this.userMapper = userMapper;
        this.profileService = profileService;
    }

    /**
     * 指定した利用者をフォローする。既にフォロー済みの場合もエラーにせず、現在の状態をそのまま返す（冪等）。
     *
     * <p>{@code follows}には自己フォローを禁止するCHECK制約（{@code chk_follows_not_self}）があるが、
     * 制約違反による500ではなく利用者にわかりやすい400を返すため、INSERT前にここでも判定する。
     */
    @Transactional
    public FollowActionResponse follow(Long targetUserId, User currentUser) {
        profileService.requireUserExists(targetUserId);
        if (targetUserId.equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot follow yourself");
        }
        followMapper.insertIgnoreConflict(currentUser.getId(), targetUserId);
        return currentState(targetUserId, currentUser.getId());
    }

    /**
     * 指定した利用者へのフォローを解除する。フォローしていない場合もエラーにせず、現在の状態をそのまま返す（冪等）。
     */
    @Transactional
    public FollowActionResponse unfollow(Long targetUserId, User currentUser) {
        profileService.requireUserExists(targetUserId);
        followMapper.delete(currentUser.getId(), targetUserId);
        return currentState(targetUserId, currentUser.getId());
    }

    public FollowListResponse listFollowers(Long userId, Long currentUserId) {
        profileService.requireUserExists(userId);
        List<UserSummaryResponse> users = followMapper.findFollowers(userId, currentUserId).stream()
                .map(UserSummaryResponse::from)
                .toList();
        return new FollowListResponse(users);
    }

    public FollowListResponse listFollowing(Long userId, Long currentUserId) {
        profileService.requireUserExists(userId);
        List<UserSummaryResponse> users = followMapper.findFollowing(userId, currentUserId).stream()
                .map(UserSummaryResponse::from)
                .toList();
        return new FollowListResponse(users);
    }

    /**
     * {@link UserMapper#findByIdWithStats}を再利用して最新のフォロー状態を取得する。
     * フォロワー数を数えるSQLを{@code UserMapper.xml}一箇所に集約するための再利用であり、
     * 利用者1件に対する単発クエリのためN+1にはならない。
     */
    private FollowActionResponse currentState(Long targetUserId, Long currentUserId) {
        UserWithStats row = userMapper.findByIdWithStats(targetUserId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        return FollowActionResponse.from(row);
    }
}
