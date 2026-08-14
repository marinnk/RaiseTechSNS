package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link LikeMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 * {@code ON CONFLICT ON CONSTRAINT uq_likes_post_user DO NOTHING}による重複防止が
 * 実際のPostgreSQL上で機能することを確認する（モックしたService層のテストでは検証できない）。
 *
 * {@link LikeMapper}自体には件数を数える手段が無いため、検証には{@link JdbcTemplate}で
 * 直接COUNTを発行する（新規のMapperメソッドはテストのためだけには増やさない）。
 */
@SpringBootTest
@Transactional
class LikeMapperTest extends AbstractIntegrationTest {

    @Autowired
    private LikeMapper likeMapper;

    @Autowired
    private PostMapper postMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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

    private int countLikes(Long postId, Long userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM likes WHERE post_id = ? AND user_id = ?", Integer.class, postId, userId);
        return count == null ? 0 : count;
    }

    @Test
    void insertIgnoreConflict_新規のいいねを登録できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);

        likeMapper.insertIgnoreConflict(postId, userId);

        assertThat(countLikes(postId, userId)).isEqualTo(1);
    }

    @Test
    void insertIgnoreConflict_同じ組み合わせを2回呼んでも例外にならず重複行は作られない() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);

        likeMapper.insertIgnoreConflict(postId, userId);
        likeMapper.insertIgnoreConflict(postId, userId);

        assertThat(countLikes(postId, userId)).isEqualTo(1);
    }

    @Test
    void delete_いいねを取り消せる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);
        likeMapper.insertIgnoreConflict(postId, userId);

        int deleted = likeMapper.delete(postId, userId);

        assertThat(deleted).isEqualTo(1);
        assertThat(countLikes(postId, userId)).isZero();
    }

    @Test
    void delete_いいねしていない状態で削除しても例外にならず0件() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId);

        int deleted = likeMapper.delete(postId, userId);

        assertThat(deleted).isZero();
    }
}
