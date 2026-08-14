package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserFollowSummary;
import com.raisetechsns.backend.entity.UserWithStats;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link UserMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 * Service層のテストでは常にモック化されているため検証できない、実際のSQLの挙動
 * （{@code ILIKE}の大文字小文字無視・{@code FOR UPDATE}の行ロック等）を確認する。
 */
@SpringBootTest
@Transactional
class UserMapperTest extends AbstractIntegrationTest {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private FollowMapper followMapper;

    @Test
    void insert_採番されたidがuserに反映される() {
        // insertUser()（AbstractIntegrationTest）は登録済みのidだけを返すため、
        // insert自体を検証するこのテストだけはUserを自前で組み立てる
        User user = new User();
        user.setUsername("taro");
        user.setEmail("taro@example.com");
        user.setPasswordHash("hashed-password");
        user.setDisplayName("太郎");

        userMapper.insert(user);

        assertThat(user.getId()).isNotNull().isPositive();
    }

    @Test
    void findByEmail_一致するメールアドレスなら取得できる() {
        insertUser("taro");

        Optional<User> found = userMapper.findByEmail("taro@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("taro");
    }

    @Test
    void findByEmail_一致しなければ空() {
        Optional<User> found = userMapper.findByEmail("nobody@example.com");

        assertThat(found).isEmpty();
    }

    @Test
    void existsByEmail_登録済みならtrue_未登録ならfalse() {
        insertUser("taro");

        assertThat(userMapper.existsByEmail("taro@example.com")).isTrue();
        assertThat(userMapper.existsByEmail("nobody@example.com")).isFalse();
    }

    @Test
    void existsByUsername_登録済みならtrue_未登録ならfalse() {
        insertUser("taro");

        assertThat(userMapper.existsByUsername("taro")).isTrue();
        assertThat(userMapper.existsByUsername("nobody")).isFalse();
    }

    @Test
    void findByIdForUpdate_FOR_UPDATE付きでも例外にならず取得できる() {
        Long userId = insertUser("taro");

        Optional<User> found = userMapper.findByIdForUpdate(userId);

        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(userId);
    }

    @Test
    void findByIdWithStats_フォロワーもフォロー中も0件ならfollowedByMeもfalse() {
        Long targetId = insertUser("taro");
        Long viewerId = insertUser("jiro");

        UserWithStats stats = userMapper.findByIdWithStats(targetId, viewerId).orElseThrow();

        assertThat(stats.getFollowerCount()).isZero();
        assertThat(stats.getFollowingCount()).isZero();
        assertThat(stats.isFollowedByMe()).isFalse();
    }

    @Test
    void findByIdWithStats_フォロワー複数件_フォロー済みならtrue() {
        Long targetId = insertUser("taro");
        Long viewerId = insertUser("jiro");
        Long otherId = insertUser("saburo");
        // targetをviewer・otherの2人がフォロー、targetはviewerを1人だけフォローしている状態を作る
        followMapper.insertIgnoreConflict(viewerId, targetId);
        followMapper.insertIgnoreConflict(otherId, targetId);
        followMapper.insertIgnoreConflict(targetId, viewerId);

        UserWithStats stats = userMapper.findByIdWithStats(targetId, viewerId).orElseThrow();

        assertThat(stats.getFollowerCount()).isEqualTo(2);
        assertThat(stats.getFollowingCount()).isEqualTo(1);
        assertThat(stats.isFollowedByMe()).isTrue();
    }

    @Test
    void searchByKeyword_大文字小文字が異なっても部分一致する() {
        insertUser("TaroYamada");
        Long viewerId = insertUser("viewer");

        List<UserFollowSummary> results = userMapper.searchByKeyword("yamada", viewerId);

        assertThat(results).extracting(UserFollowSummary::getUsername).containsExactly("TaroYamada");
    }

    @Test
    void searchByKeyword_一致しなければ空() {
        insertUser("taro");
        Long viewerId = insertUser("viewer");

        List<UserFollowSummary> results = userMapper.searchByKeyword("nonexistent-keyword", viewerId);

        assertThat(results).isEmpty();
    }

    @Test
    void searchByKeyword_複数件ヒットする() {
        insertUser("taro1");
        insertUser("taro2");
        Long viewerId = insertUser("viewer");

        List<UserFollowSummary> results = userMapper.searchByKeyword("taro", viewerId);

        assertThat(results).hasSize(2);
    }

    @Test
    void updateBio_更新した内容がfindByIdで取得できる() {
        Long userId = insertUser("taro");

        userMapper.updateBio(userId, "更新後のbio");

        assertThat(userMapper.findById(userId).orElseThrow().getBio()).isEqualTo("更新後のbio");
    }

    @Test
    void updateAvatarUrl_更新した内容がfindByIdで取得できる() {
        Long userId = insertUser("taro");

        userMapper.updateAvatarUrl(userId, "https://example.com/avatar.png");

        assertThat(userMapper.findById(userId).orElseThrow().getAvatarUrl())
                .isEqualTo("https://example.com/avatar.png");
    }
}
