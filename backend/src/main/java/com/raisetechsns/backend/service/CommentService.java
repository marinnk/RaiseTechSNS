package com.raisetechsns.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.CommentListResponse;
import com.raisetechsns.backend.dto.CommentResponse;
import com.raisetechsns.backend.dto.CreateCommentRequest;
import com.raisetechsns.backend.entity.Comment;
import com.raisetechsns.backend.entity.CommentWithAuthor;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.CommentMapper;

@Service
public class CommentService {

    private final CommentMapper commentMapper;
    private final PostService postService;

    public CommentService(CommentMapper commentMapper, PostService postService) {
        this.commentMapper = commentMapper;
        this.postService = postService;
    }

    /**
     * 指定した投稿のコメント一覧を古い順（{@code id}昇順）で取得する。
     */
    public CommentListResponse list(Long postId, Long currentUserId) {
        postService.requirePostExists(postId);
        return new CommentListResponse(
                commentMapper.findAllWithAuthorByPostId(postId).stream()
                        .map(row -> CommentResponse.from(row, currentUserId))
                        .toList());
    }

    @Transactional
    public CommentResponse create(Long postId, CreateCommentRequest request, User currentUser) {
        postService.requirePostExists(postId);
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(currentUser.getId());
        comment.setContent(request.content());
        commentMapper.insert(comment);
        CommentWithAuthor row = commentMapper.findByIdWithAuthor(comment.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "comment not found after insert"));
        return CommentResponse.from(row, currentUser.getId());
    }

    @Transactional
    public void delete(Long commentId, User currentUser) {
        requireOwnComment(commentId, currentUser);
        int deleted = commentMapper.delete(commentId, currentUser.getId());
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "comment not found");
        }
    }

    /**
     * コメントの存在確認と所有者チェックを行う。マッパーのDELETE文にも{@code user_id}条件を
     * 付けているが、他人のコメントかどうかを利用者に403として伝えるため、事前にここで判定する
     * （{@link PostService#requireOwnPost}と同じ設計）。
     */
    private void requireOwnComment(Long commentId, User currentUser) {
        Comment existing = commentMapper.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "comment not found"));
        if (!existing.getUserId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "cannot delete another user's comment");
        }
    }
}
