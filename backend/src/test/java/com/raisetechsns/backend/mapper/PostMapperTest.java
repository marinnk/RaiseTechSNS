package com.raisetechsns.backend.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.raisetechsns.backend.entity.Comment;
import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.PostWithAuthor;
import com.raisetechsns.backend.support.AbstractIntegrationTest;

/**
 * {@link PostMapper}を実際のPostgreSQL（Testcontainers）に対して実行するテスト。
 * カーソルページネーション・相関サブクエリによる集計・動的SQL（{@code <if>}によるスコープ絞り込み）
 * を、モックでは検証できない実際のSQLの挙動として確認する。
 */
@SpringBootTest
@Transactional
class PostMapperTest extends AbstractIntegrationTest {

    @Autowired
    private PostMapper postMapper;

    @Autowired
    private LikeMapper likeMapper;

    @Autowired
    private CommentMapper commentMapper;

    @Autowired
    private FollowMapper followMapper;

    @Test
    void insert_採番されたidがpostに反映される() {
        Long userId = insertUser("taro");
        Post post = new Post();
        post.setUserId(userId);
        post.setContent("こんにちは");

        postMapper.insert(post);

        assertThat(post.getId()).isNotNull().isPositive();
    }

    @Test
    void findAllWithAuthor_limit件数ちょうどで打ち切られ新しい順に返る() {
        Long userId = insertUser("taro");
        Long id1 = insertPost(userId, "1件目");
        Long id2 = insertPost(userId, "2件目");
        Long id3 = insertPost(userId, "3件目");

        List<PostWithAuthor> result = postMapper.findAllWithAuthor(2, null, userId, null, false);

        // idの降順（新しい順）でlimit=2件だけ返り、最も古いid1は含まれない
        assertThat(result).extracting(PostWithAuthor::getPostId).containsExactly(id3, id2);
    }

    @Test
    void findAllWithAuthor_beforeIdは指定id自身を含まずそれより古い投稿だけ返す() {
        Long userId = insertUser("taro");
        Long id1 = insertPost(userId, "1件目");
        Long id2 = insertPost(userId, "2件目");
        Long id3 = insertPost(userId, "3件目");

        List<PostWithAuthor> result = postMapper.findAllWithAuthor(10, id3, userId, null, false);

        assertThat(result).extracting(PostWithAuthor::getPostId).containsExactly(id2, id1);
    }

    @Test
    void findAllWithAuthor_いいね数コメント数likedByMeが相関サブクエリで正しく反映される() {
        Long author = insertUser("taro");
        Long liker = insertUser("jiro");
        Long postId = insertPost(author, "対象の投稿");
        Long otherPostId = insertPost(author, "いいね・コメントなしの投稿");
        likeMapper.insertIgnoreConflict(postId, liker);
        likeMapper.insertIgnoreConflict(postId, author);
        commentMapper.insert(newComment(postId, liker, "コメント"));

        List<PostWithAuthor> result = postMapper.findAllWithAuthor(10, null, liker, null, false);

        assertThat(result).filteredOn(p -> p.getPostId().equals(postId))
                .extracting(PostWithAuthor::getLikeCount, PostWithAuthor::getCommentCount, PostWithAuthor::isLikedByMe)
                .containsExactly(tuple(2L, 1L, true));
        assertThat(result).filteredOn(p -> p.getPostId().equals(otherPostId))
                .extracting(PostWithAuthor::getLikeCount, PostWithAuthor::getCommentCount, PostWithAuthor::isLikedByMe)
                .containsExactly(tuple(0L, 0L, false));
    }

    @Test
    void findAllWithAuthor_targetUserIdを指定するとその利用者の投稿だけに絞り込まれる() {
        Long userA = insertUser("taro");
        Long userB = insertUser("jiro");
        Long postA = insertPost(userA, "Aの投稿");
        insertPost(userB, "Bの投稿");

        List<PostWithAuthor> result = postMapper.findAllWithAuthor(10, null, userA, userA, false);

        assertThat(result).extracting(PostWithAuthor::getPostId).containsExactly(postA);
    }

    @Test
    void findAllWithAuthor_followingOnlyがtrueなら自分とフォロー中の投稿だけに絞り込まれる() {
        Long viewer = insertUser("viewer");
        Long following = insertUser("following");
        Long notFollowing = insertUser("not-following");
        followMapper.insertIgnoreConflict(viewer, following);
        Long ownPost = insertPost(viewer, "自分の投稿");
        Long followingPost = insertPost(following, "フォロー中の投稿");
        insertPost(notFollowing, "フォローしていない相手の投稿");

        List<PostWithAuthor> result = postMapper.findAllWithAuthor(10, null, viewer, null, true);

        assertThat(result).extracting(PostWithAuthor::getPostId).containsExactlyInAnyOrder(ownPost, followingPost);
    }

    @Test
    void findNewerWithAuthor_afterIdより新しい投稿だけを古い順に返す() {
        Long userId = insertUser("taro");
        Long id1 = insertPost(userId, "1件目");
        Long id2 = insertPost(userId, "2件目");
        Long id3 = insertPost(userId, "3件目");

        List<PostWithAuthor> result = postMapper.findNewerWithAuthor(id1, 10, userId, null, false);

        // afterId自身(id1)は含まれず、id2, id3が古い順（昇順）で返る
        assertThat(result).extracting(PostWithAuthor::getPostId).containsExactly(id2, id3);
    }

    @Test
    void findByIdWithAuthor_存在する投稿を取得できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");

        Optional<PostWithAuthor> found = postMapper.findByIdWithAuthor(postId, userId);

        assertThat(found).isPresent();
        assertThat(found.get().getContent()).isEqualTo("本文");
    }

    @Test
    void update_本人の投稿なら更新できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "更新前");

        int updated = postMapper.update(postId, userId, "更新後");

        assertThat(updated).isEqualTo(1);
        assertThat(postMapper.findById(postId).orElseThrow().getContent()).isEqualTo("更新後");
    }

    @Test
    void update_他人の投稿は更新できない() {
        Long owner = insertUser("taro");
        Long other = insertUser("jiro");
        Long postId = insertPost(owner, "更新前");

        int updated = postMapper.update(postId, other, "更新後");

        assertThat(updated).isZero();
        assertThat(postMapper.findById(postId).orElseThrow().getContent()).isEqualTo("更新前");
    }

    @Test
    void delete_本人の投稿なら削除できる() {
        Long userId = insertUser("taro");
        Long postId = insertPost(userId, "本文");

        int deleted = postMapper.delete(postId, userId);

        assertThat(deleted).isEqualTo(1);
        assertThat(postMapper.findById(postId)).isEmpty();
    }

    private static Comment newComment(Long postId, Long userId, String content) {
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        return comment;
    }
}
