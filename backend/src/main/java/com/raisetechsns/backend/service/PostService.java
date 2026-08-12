package com.raisetechsns.backend.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.PostListResponse;
import com.raisetechsns.backend.dto.PostResponse;
import com.raisetechsns.backend.dto.UpdatePostRequest;
import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.PostMapper;

@Service
public class PostService {

    private static final Logger LOG = LoggerFactory.getLogger(PostService.class);
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final PostMapper postMapper;

    public PostService(PostMapper postMapper) {
        this.postMapper = postMapper;
    }

    /**
     * 投稿一覧を新しい順（id降順）で取得する。{@code beforeId}・{@code afterId}は同時に指定できない。
     *
     * @param beforeId 指定するとこのidより古い投稿を取得する（無限スクロールでの追加読み込み用）
     * @param afterId 指定するとこのidより新しい投稿を取得する（ポーリングでの新着差分取得用）
     */
    public PostListResponse list(Integer limit, Long beforeId, Long afterId, Long currentUserId) {
        if (beforeId != null && afterId != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "beforeId and afterId cannot be used together");
        }
        int clampedLimit = clampLimit(limit);

        if (afterId != null) {
            return listNewerThan(afterId, clampedLimit, currentUserId);
        }

        List<PostWithAuthor> rows = postMapper.findAllWithAuthor(clampedLimit + 1, beforeId, currentUserId);
        boolean hasMore = rows.size() > clampedLimit;
        List<PostWithAuthor> page = hasMore ? rows.subList(0, clampedLimit) : rows;

        List<PostResponse> posts = page.stream().map(row -> PostResponse.from(row, currentUserId)).toList();
        return new PostListResponse(posts, hasMore);
    }

    /**
     * ポーリングでの新着差分取得用。{@code hasMore}は呼び出し側（ポーリング）では使わないため常にfalseを返す。
     *
     * <p>{@code findNewerWithAuthor}は取りこぼしを防ぐため古い順に{@code limit}件だけ返すので、
     * レスポンスの並び順（新しい順）に揃えるためにここで反転する。
     */
    private PostListResponse listNewerThan(Long afterId, int limit, Long currentUserId) {
        List<PostWithAuthor> ascendingRows = postMapper.findNewerWithAuthor(afterId, limit, currentUserId);
        List<PostResponse> posts = ascendingRows.stream()
                .map(row -> PostResponse.from(row, currentUserId))
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.reverse(posts);
        return new PostListResponse(posts, false);
    }

    @Transactional
    public PostResponse create(CreatePostRequest request, User currentUser) {
        Post post = new Post();
        post.setUserId(currentUser.getId());
        post.setContent(request.content());
        postMapper.insert(post);
        LOG.info("post created: id={}, userId={}", post.getId(), currentUser.getId());
        return findByIdOrThrow(post.getId(), currentUser.getId());
    }

    @Transactional
    public PostResponse update(Long postId, UpdatePostRequest request, User currentUser) {
        requireOwnPost(postId, currentUser);
        int updated = postMapper.update(postId, currentUser.getId(), request.content());
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found");
        }
        return findByIdOrThrow(postId, currentUser.getId());
    }

    @Transactional
    public void delete(Long postId, User currentUser) {
        requireOwnPost(postId, currentUser);
        int deleted = postMapper.delete(postId, currentUser.getId());
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found");
        }
    }

    /**
     * 投稿の存在確認と所有者チェックを行う。マッパーのUPDATE/DELETE文にも{@code user_id}条件を
     * 付けているが、他人の投稿かどうかを利用者に403として伝えるため、事前にここで判定する。
     */
    private void requireOwnPost(Long postId, User currentUser) {
        Post existing = postMapper.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
        if (!existing.getUserId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "cannot modify another user's post");
        }
    }

    private PostResponse findByIdOrThrow(Long postId, Long currentUserId) {
        PostWithAuthor row = postMapper.findByIdWithAuthor(postId, currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
        return PostResponse.from(row, currentUserId);
    }

    private int clampLimit(Integer limit) {
        int value = limit == null ? DEFAULT_LIMIT : limit;
        return Math.min(Math.max(value, 1), MAX_LIMIT);
    }
}
