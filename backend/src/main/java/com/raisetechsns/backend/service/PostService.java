package com.raisetechsns.backend.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CreatePostRequest;
import com.raisetechsns.backend.dto.PostImageResponse;
import com.raisetechsns.backend.dto.PostListResponse;
import com.raisetechsns.backend.dto.PostResponse;
import com.raisetechsns.backend.dto.UpdatePostRequest;
import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.PostImage;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.PostImageMapper;
import com.raisetechsns.backend.mapper.PostMapper;
import com.raisetechsns.backend.storage.StorageService;
import com.raisetechsns.backend.validation.ImageValidation;

@Service
public class PostService {

    private static final Logger LOG = LoggerFactory.getLogger(PostService.class);
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;
    private static final int MAX_IMAGES_PER_POST = 4;
    private static final String IMAGE_FOLDER = "posts";

    private final PostMapper postMapper;
    private final PostImageMapper postImageMapper;
    private final StorageService storageService;

    public PostService(PostMapper postMapper, PostImageMapper postImageMapper, StorageService storageService) {
        this.postMapper = postMapper;
        this.postImageMapper = postImageMapper;
        this.storageService = storageService;
    }

    /**
     * 投稿一覧を新しい順（id降順）で取得する。{@code beforeId}・{@code afterId}は同時に指定できない。
     *
     * @param beforeId 指定するとこのidより古い投稿を取得する（無限スクロールでの追加読み込み用）
     * @param afterId 指定するとこのidより新しい投稿を取得する（ポーリングでの新着差分取得用）
     * @param targetUserId 指定するとこの利用者の投稿のみに絞り込む（プロフィール画面の投稿一覧用）
     * @param followingOnly trueなら、フォロー中の利用者（および自分自身）の投稿のみに絞り込む
     *     （タイムラインの「フォロー中」タブ用）。{@code targetUserId}と同時に指定はできない
     */
    public PostListResponse list(Integer limit, Long beforeId, Long afterId, Long currentUserId,
            Long targetUserId, boolean followingOnly) {
        if (beforeId != null && afterId != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "beforeId and afterId cannot be used together");
        }
        if (targetUserId != null && followingOnly) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId and scope=following cannot be used together");
        }
        int clampedLimit = clampLimit(limit);

        if (afterId != null) {
            return listNewerThan(afterId, clampedLimit, currentUserId, targetUserId, followingOnly);
        }

        List<PostWithAuthor> rows = postMapper.findAllWithAuthor(
                clampedLimit + 1, beforeId, currentUserId, targetUserId, followingOnly);
        boolean hasMore = rows.size() > clampedLimit;
        List<PostWithAuthor> page = hasMore ? rows.subList(0, clampedLimit) : rows;

        List<PostResponse> posts = toResponsesWithImages(page, currentUserId);
        return new PostListResponse(posts, hasMore);
    }

    /**
     * ポーリングでの新着差分取得用。{@code hasMore}は呼び出し側（ポーリング）では使わないため常にfalseを返す。
     *
     * <p>{@code findNewerWithAuthor}は取りこぼしを防ぐため古い順に{@code limit}件だけ返すので、
     * レスポンスの並び順（新しい順）に揃えるためにここで反転する。
     */
    private PostListResponse listNewerThan(Long afterId, int limit, Long currentUserId,
            Long targetUserId, boolean followingOnly) {
        List<PostWithAuthor> ascendingRows = postMapper.findNewerWithAuthor(
                afterId, limit, currentUserId, targetUserId, followingOnly);
        List<PostResponse> posts = toResponsesWithImages(ascendingRows, currentUserId).stream()
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.reverse(posts);
        return new PostListResponse(posts, false);
    }

    /**
     * ページ内の投稿idをまとめて{@link PostImageMapper#findByPostIds}に渡し、投稿件数分の
     * クエリが発生する（N+1問題）のを避ける。
     */
    private List<PostResponse> toResponsesWithImages(List<PostWithAuthor> rows, Long currentUserId) {
        List<Long> postIds = rows.stream().map(PostWithAuthor::getPostId).toList();
        // postIdsが空だと、findByPostIdsのSQLの IN (...) が空になり構文エラーになるため、
        // その場合はマッパーを呼ばずに空のMapを使う（投稿が0件のタイムライン等で毎回発生しうる）
        Map<Long, List<PostImageResponse>> imagesByPostId = postIds.isEmpty()
                ? Map.of()
                : postImageMapper.findByPostIds(postIds).stream()
                        .collect(Collectors.groupingBy(
                                PostImage::getPostId,
                                Collectors.mapping(PostImageResponse::from, Collectors.toList())));
        return rows.stream()
                .map(row -> PostResponse.from(row, currentUserId,
                        imagesByPostId.getOrDefault(row.getPostId(), List.of())))
                .toList();
    }

    /**
     * 投稿を作成する。画像は最大{@value #MAX_IMAGES_PER_POST}枚まで、jpg/png・5MB以下（{@link ImageValidation}）。
     *
     * <p>枚数チェック・形式チェックはすべてのアップロード処理より前に行うため、検証エラーで
     * 中断した場合にS3へのアップロードが一部だけ発生してしまう（孤立した画像が残る）ことはない。
     * 一方、検証を通過した後のアップロード自体が（インフラ障害等で）途中失敗した場合は、
     * その回だけ孤立した画像が残りうる。学習規模のアプリでは許容し、今回は対応しない。
     */
    @Transactional
    public PostResponse create(CreatePostRequest request, List<MultipartFile> images, User currentUser) {
        List<MultipartFile> nonEmptyImages = nonEmptyImages(images);
        validateImageCount(nonEmptyImages.size());
        nonEmptyImages.forEach(ImageValidation::validate);

        Post post = new Post();
        post.setUserId(currentUser.getId());
        post.setContent(request.content());
        postMapper.insert(post);
        insertImages(post.getId(), nonEmptyImages, 0);
        LOG.info("post created: id={}, userId={}, images={}", post.getId(), currentUser.getId(), nonEmptyImages.size());
        return findByIdOrThrow(post.getId(), currentUser.getId());
    }

    /**
     * 投稿を編集する。{@code request.keepImageIds()}で指定した既存画像だけを残し、{@code newImages}を
     * 追加する（残す枚数＋新規枚数が{@value #MAX_IMAGES_PER_POST}枚を超えると400）。
     *
     * <p>既存の{@code post_images}行は一旦すべて削除し、残す画像をkeepImageIdsの順で、続けて
     * 新規画像を、表示順を0から振り直して入れ直す。削除対象（keepImageIdsに含まれなかった
     * 既存画像）のS3上の実ファイルは、{@link StorageService#deleteAfterCommit}によりこの
     * トランザクションがコミットされた後に削除する。
     */
    @Transactional
    public PostResponse update(Long postId, UpdatePostRequest request, List<MultipartFile> newImages,
            User currentUser) {
        requireOwnPost(postId, currentUser);
        List<PostImage> existingImages = postImageMapper.findByPostId(postId);
        Map<Long, PostImage> existingImagesById = existingImages.stream()
                .collect(Collectors.toMap(PostImage::getId, image -> image));

        Set<Long> keepImageIds = new HashSet<>(request.keepImageIds());
        if (!existingImagesById.keySet().containsAll(keepImageIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "keepImageIds contains an unknown image id");
        }

        List<MultipartFile> nonEmptyNewImages = nonEmptyImages(newImages);
        validateImageCount(keepImageIds.size() + nonEmptyNewImages.size());
        nonEmptyNewImages.forEach(ImageValidation::validate);

        int updated = postMapper.update(postId, currentUser.getId(), request.content());
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found");
        }

        postImageMapper.deleteByPostId(postId);
        int order = 0;
        for (Long keepId : request.keepImageIds()) {
            PostImage kept = existingImagesById.get(keepId);
            postImageMapper.insert(postId, kept.getImageUrl(), order++);
        }
        insertImages(postId, nonEmptyNewImages, order);

        for (PostImage existing : existingImages) {
            if (!keepImageIds.contains(existing.getId())) {
                storageService.deleteAfterCommit(existing.getImageUrl());
            }
        }

        return findByIdOrThrow(postId, currentUser.getId());
    }

    /**
     * 投稿を削除する。{@code post_images}はDB側の{@code ON DELETE CASCADE}（V5マイグレーション）で
     * 自動的に削除されるが、S3上の実ファイルはアプリ側で削除する必要があるため、投稿を削除する
     * 前に画像のURLを取得しておき、コミット後に削除する。
     */
    @Transactional
    public void delete(Long postId, User currentUser) {
        requireOwnPost(postId, currentUser);
        List<PostImage> images = postImageMapper.findByPostId(postId);
        int deleted = postMapper.delete(postId, currentUser.getId());
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found");
        }
        images.forEach(image -> storageService.deleteAfterCommit(image.getImageUrl()));
    }

    /**
     * 投稿の存在確認だけを行う（所有者チェックはしない）。コメント・いいねなど、投稿の存在を
     * 前提とする他サービスから呼ばれる共通の入口。{@code requireOwnPost}と重複させないよう、
     * 「投稿が存在するか」の判定ロジックはここに集約する。
     *
     * @throws ResponseStatusException 投稿が存在しない場合（404）
     */
    public void requirePostExists(Long postId) {
        postMapper.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));
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
        List<PostImageResponse> images = postImageMapper.findByPostId(postId).stream()
                .map(PostImageResponse::from)
                .toList();
        return PostResponse.from(row, currentUserId, images);
    }

    /**
     * Spring MultipartのList引数は、画像を1枚も選ばなかった場合に空のMultipartFile（サイズ0、
     * ファイル名も空）を1件含んだリストで渡ってくることがあるため、それらを除いてから枚数・
     * 内容を検証する。
     */
    private List<MultipartFile> nonEmptyImages(List<MultipartFile> images) {
        if (images == null) {
            return List.of();
        }
        return images.stream().filter(file -> file != null && !file.isEmpty()).toList();
    }

    private void validateImageCount(int count) {
        if (count > MAX_IMAGES_PER_POST) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "a post can have at most " + MAX_IMAGES_PER_POST + " images");
        }
    }

    private void insertImages(Long postId, List<MultipartFile> images, int startOrder) {
        int order = startOrder;
        for (MultipartFile image : images) {
            String url = storageService.upload(IMAGE_FOLDER, image);
            postImageMapper.insert(postId, url, order++);
        }
    }

    private int clampLimit(Integer limit) {
        int value = limit == null ? DEFAULT_LIMIT : limit;
        return Math.min(Math.max(value, 1), MAX_LIMIT);
    }
}
