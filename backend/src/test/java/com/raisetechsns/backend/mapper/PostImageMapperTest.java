package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.PostImage;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link PostImageMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 */
@SpringBootTest
@Transactional
class PostImageMapperTest extends AbstractIntegrationTest {

    @Autowired
    private PostImageMapper postImageMapper;

    private Long insertPost(String username) {
        return insertPost(insertUser(username), "本文");
    }

    @Test
    void insertとfindByPostIdの往復() {
        Long postId = insertPost("taro");

        postImageMapper.insert(postId, "https://example.com/1.png", 0);

        List<PostImage> images = postImageMapper.findByPostId(postId);
        assertThat(images).hasSize(1);
        assertThat(images.get(0).getImageUrl()).isEqualTo("https://example.com/1.png");
        assertThat(images.get(0).getDisplayOrder()).isZero();
    }

    @Test
    void findByPostIds_複数投稿にまたがる画像をまとめて取得できる() {
        Long postA = insertPost("taro");
        Long postB = insertPost("jiro");
        postImageMapper.insert(postA, "https://example.com/a1.png", 0);
        postImageMapper.insert(postA, "https://example.com/a2.png", 1);
        postImageMapper.insert(postB, "https://example.com/b1.png", 0);

        List<PostImage> images = postImageMapper.findByPostIds(List.of(postA, postB));

        assertThat(images).hasSize(3);
        assertThat(images).filteredOn(image -> image.getPostId().equals(postA)).hasSize(2);
        assertThat(images).filteredOn(image -> image.getPostId().equals(postB)).hasSize(1);
    }

    @Test
    void findByPostIds_空リストを渡すとSQL構文エラーになる() {
        // MyBatisの<foreach open="(" separator="," close=")">は、空リストを渡すと
        // 生成されるSQLが「post_id IN ( )」という不正な構文になり例外を投げる。
        // これはPostServiceのtoResponsesWithImagesが呼び出し前に空リストなら
        // マッパーを呼ばずMap.of()を使う、というガードを入れている理由そのものであり、
        // モックしたテストでは絶対に発見できない実DBならではの挙動である。
        assertThatThrownBy(() -> postImageMapper.findByPostIds(List.of()))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("syntax error");
    }

    @Test
    void deleteByPostId_対象投稿の画像だけ削除され他の投稿の画像は残る() {
        Long postA = insertPost("taro");
        Long postB = insertPost("jiro");
        postImageMapper.insert(postA, "https://example.com/a1.png", 0);
        postImageMapper.insert(postB, "https://example.com/b1.png", 0);

        postImageMapper.deleteByPostId(postA);

        assertThat(postImageMapper.findByPostId(postA)).isEmpty();
        assertThat(postImageMapper.findByPostId(postB)).hasSize(1);
    }
}
