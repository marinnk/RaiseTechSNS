package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserFollowSummary;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link FollowMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 * {@code ON CONFLICT ON CONSTRAINT uq_follows_follower_followee DO NOTHING}による重複防止と、
 * {@code chk_follows_not_self} CHECK制約（自己フォロー禁止）が実際のPostgreSQL上で機能することを
 * 確認する（いずれもモックしたService層のテストでは検証できない）。
 */
@SpringBootTest
@Transactional
class FollowMapperTest extends AbstractIntegrationTest {

    @Autowired
    private FollowMapper followMapper;

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

    @Test
    void insertIgnoreConflict_同じ組み合わせを2回呼んでも例外にならず重複行は作られない() {
        Long follower = insertUser("taro");
        Long followee = insertUser("jiro");

        followMapper.insertIgnoreConflict(follower, followee);
        followMapper.insertIgnoreConflict(follower, followee);

        assertThat(followMapper.findFollowing(follower, follower)).hasSize(1);
    }

    @Test
    void insertIgnoreConflict_自分自身をフォローしようとするとCHECK制約違反になる() {
        // ON CONFLICTはUNIQUE制約の重複だけを無視する仕組みで、CHECK制約
        // （chk_follows_not_self）違反までは吸収しない。実際にDBへ投げてみないと
        // 確認できない、モックテストでは絶対に発見できない制約違反である。
        Long userId = insertUser("taro");

        assertThatThrownBy(() -> followMapper.insertIgnoreConflict(userId, userId))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void findFollowers_フォロワー一覧とfollowedByMeが正しく取得できる() {
        Long target = insertUser("taro");
        Long followerA = insertUser("jiro");
        Long followerB = insertUser("saburo");
        followMapper.insertIgnoreConflict(followerA, target);
        followMapper.insertIgnoreConflict(followerB, target);
        // targetから見て、followerAだけをフォローバックしている状態にする
        followMapper.insertIgnoreConflict(target, followerA);

        List<UserFollowSummary> followers = followMapper.findFollowers(target, target);

        assertThat(followers).extracting(UserFollowSummary::getId).containsExactlyInAnyOrder(followerA, followerB);
        assertThat(followers.stream().filter(u -> u.getId().equals(followerA)).findFirst().orElseThrow()
                .isFollowedByMe()).isTrue();
        assertThat(followers.stream().filter(u -> u.getId().equals(followerB)).findFirst().orElseThrow()
                .isFollowedByMe()).isFalse();
    }

    @Test
    void findFollowing_フォロー中一覧が正しく取得できる() {
        Long viewer = insertUser("taro");
        Long followee = insertUser("jiro");
        followMapper.insertIgnoreConflict(viewer, followee);

        List<UserFollowSummary> following = followMapper.findFollowing(viewer, viewer);

        assertThat(following).extracting(UserFollowSummary::getId).containsExactly(followee);
        assertThat(following.get(0).isFollowedByMe()).isTrue();
    }

    @Test
    void delete_フォローを解除できる() {
        Long follower = insertUser("taro");
        Long followee = insertUser("jiro");
        followMapper.insertIgnoreConflict(follower, followee);

        int deleted = followMapper.delete(follower, followee);

        assertThat(deleted).isEqualTo(1);
        assertThat(followMapper.findFollowing(follower, follower)).isEmpty();
    }

    @Test
    void delete_フォローしていない状態で解除しても例外にならず0件() {
        Long follower = insertUser("taro");
        Long followee = insertUser("jiro");

        int deleted = followMapper.delete(follower, followee);

        assertThat(deleted).isZero();
    }
}
