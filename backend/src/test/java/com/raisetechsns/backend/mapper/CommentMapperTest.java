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
import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link CommentMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 */
@SpringBootTest
@Transactional
class CommentMapperTest extends AbstractIntegrationTest {

    @Autowired
    private CommentMapper commentMapper;

    @Autowired
    private PostMapper postMapper;

    @Autowired
    private UserMapper userMapper;

    private Long insertUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hashed-password");
        user.setDisplayName(username + "の表示名");
        userMapper.insert(user);
        return user.getId();
    }

    private Long insertPost(Long userId) {
        Post post = new Post();
        post.setUserId(userId);
        post.setContent("本文");
        postMapper.insert(post);
        return post.getId();
    }

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
        Long postId = insertPost(userId);
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
        Long postId = insertPost(userId);
        Long id1 = insertComment(postId, userId, "1件目");
        Long id2 = insertComment(postId, userId, "2件目");
        Long id3 = insertComment(postId, userId, "3件目");

        List<CommentWithAuthor> result = commentMapper.findAllWithAuthorByPostId(postId);

        assertThat(result).extracting(CommentWithAuthor::getCommentId).containsExactly(id1, id2, id3);
    }

    @Test
    void findByIdWithAuthor_存在するコメントを取得できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);
        Long commentId = insertComment(postId, userId, "コメント本文");

        Optional<CommentWithAuthor> found = commentMapper.findByIdWithAuthor(commentId);

        assertThat(found).isPresent();
        assertThat(found.get().getContent()).isEqualTo("コメント本文");
    }

    @Test
    void findById_存在するコメントを取得できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);
        Long commentId = insertComment(postId, userId, "コメント本文");

        Optional<Comment> found = commentMapper.findById(commentId);

        assertThat(found).isPresent();
        assertThat(found.get().getPostId()).isEqualTo(postId);
    }

    @Test
    void delete_本人のコメントなら対象のコメントだけ削除できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);
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
        Long postId = insertPost(owner);
        Long commentId = insertComment(postId, owner, "コメント本文");

        int deleted = commentMapper.delete(commentId, other);

        assertThat(deleted).isZero();
        assertThat(commentMapper.findById(commentId)).isPresent();
    }
}
