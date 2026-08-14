package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.Comment;
import com.raisetechsns.backend.entity.CommentWithAuthor;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link CommentMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 */
@SpringBootTest
@Transactional
class CommentMapperTest extends AbstractIntegrationTest {

    @Autowired
    private CommentMapper commentMapper;

    private Long insertComment(Long postId, Long userId, String content) {
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        commentMapper.insert(comment);
        return comment.getId();
    }

    @Test
    void insert_採番されたidがcommentに反映される() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent("コメント本文");

        commentMapper.insert(comment);

        assertThat(comment.getId()).isNotNull().isPositive();
    }

    @Test
    void findAllWithAuthorByPostId_古い順id昇順で返る() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");
        Long id1 = insertComment(postId, userId, "1件目");
        Long id2 = insertComment(postId, userId, "2件目");

        List<CommentWithAuthor> result = commentMapper.findAllWithAuthorByPostId(postId);

        assertThat(result).extracting(CommentWithAuthor::getCommentId).containsExactly(id1, id2);
    }

    @Test
    void findByIdWithAuthor_存在するコメントを取得できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");
        Long commentId = insertComment(postId, userId, "コメント本文");

        Optional<CommentWithAuthor> found = commentMapper.findByIdWithAuthor(commentId);

        assertThat(found).isPresent();
        assertThat(found.get().getContent()).isEqualTo("コメント本文");
    }

    @Test
    void findById_存在するコメントを取得できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");
        Long commentId = insertComment(postId, userId, "コメント本文");

        Optional<Comment> found = commentMapper.findById(commentId);

        assertThat(found).isPresent();
        assertThat(found.get().getPostId()).isEqualTo(postId);
    }

    @Test
    void delete_本人のコメントなら対象のコメントだけ削除できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");
        Long keepId = insertComment(postId, userId, "残るコメント");
        Long deleteId = insertComment(postId, userId, "削除するコメント");

        int deleted = commentMapper.delete(deleteId, userId);

        assertThat(deleted).isEqualTo(1);
        assertThat(commentMapper.findById(deleteId)).isEmpty();
        assertThat(commentMapper.findById(keepId)).isPresent();
    }

    @Test
    void delete_他人のコメントは削除できない() {
        Long owner = insertUser("taro");
        Long other = insertUser("jiro");
        Long postId = insertPost(owner, "本文");
        Long commentId = insertComment(postId, owner, "コメント本文");

        int deleted = commentMapper.delete(commentId, other);

        assertThat(deleted).isZero();
        assertThat(commentMapper.findById(commentId)).isPresent();
    }
}
