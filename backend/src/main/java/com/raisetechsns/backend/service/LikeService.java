package com.raisetechsns.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.LikeResponse;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.LikeMapper;
import com.raisetechsns.backend.mapper.PostMapper;

@Service
public class LikeService {

    private final LikeMapper likeMapper;
    private final PostMapper postMapper;

    public LikeService(LikeMapper likeMapper, PostMapper postMapper) {
        this.likeMapper = likeMapper;
        this.postMapper = postMapper;
    }

    /**
     * 投稿にいいねする。既にいいね済みの場合もエラーにせず、現在の状態をそのまま返す（冪等）。
     */
    @Transactional
    public LikeResponse like(Long postId, User currentUser) {
        requirePostExists(postId);
        likeMapper.insertIgnoreConflict(postId, currentUser.getId());
        return currentState(postId, currentUser.getId());
    }

    /**
     * 投稿へのいいねを取り消す。いいねしていない場合もエラーにせず、現在の状態をそのまま返す（冪等）。
     */
    @Transactional
    public LikeResponse unlike(Long postId, User currentUser) {
        requirePostExists(postId);
        likeMapper.delete(postId, currentUser.getId());
        return currentState(postId, currentUser.getId());
    }

    /**
     * {@link PostMapper#findByIdWithAuthor}を再利用して最新のいいね数・いいね済みフラグを取得する。
     * いいね数を数えるSQLを{@code PostMapper.xml}一箇所に集約するための再利用であり、
     * 投稿1件に対する単発クエリのためN+1にはならない。
     */
    private LikeResponse currentState(Long postId, Long currentUserId) {
        PostWithAuthor row = postMapper.findByIdWithAuthor(postId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
        return LikeResponse.from(row);
    }

    private void requirePostExists(Long postId) {
        postMapper.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
    }
}
