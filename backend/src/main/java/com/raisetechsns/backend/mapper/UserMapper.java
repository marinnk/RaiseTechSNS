package com.raisetechsns.backend.mapper;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.entity.UserFollowSummary;
import com.raisetechsns.backend.entity.UserWithStats;

/**
 * {@code users}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/UserMapper.xml}に書く。
 */
@Mapper
public interface UserMapper {

    Optional<User> findById(@Param("id") Long id);

    /**
     * {@code findById}と同じだが、行ロック（{@code SELECT ... FOR UPDATE}）を取得したうえで返す。
     * アバター画像の登録・削除のように「今の値を読んでから、それを踏まえて更新・削除する」処理で、
     * 同一利用者に対する同時リクエストが競合しないよう直列化するために使う。
     * 呼び出し元は必ず{@code @Transactional}なメソッド内で使うこと（トランザクションが終わるまで
     * ロックが保持される）。
     */
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    Optional<User> findByEmail(@Param("email") String email);

    boolean existsByEmail(@Param("email") String email);

    boolean existsByUsername(@Param("username") String username);

    /**
     * 新規会員を1件登録する。実行すると、DBで採番されたIDが{@code user}に反映される。
     */
    void insert(User user);

    /**
     * プロフィール画面用に、利用者1件をフォロワー数・フォロー中数・ログイン中利用者がフォロー済みか
     * どうかとあわせて取得する（{@link com.raisetechsns.backend.mapper.PostMapper#findByIdWithAuthor}と
     * 同じ相関サブクエリ・EXISTSの考え方）。
     *
     * @param currentUserId ログイン中の利用者のid。{@code followedByMe}の判定に使う
     */
    Optional<UserWithStats> findByIdWithStats(@Param("id") Long id, @Param("currentUserId") Long currentUserId);

    /**
     * 自己紹介を更新する。
     *
     * @return 更新できた件数（0なら対象が存在しない）
     */
    int updateBio(@Param("id") Long id, @Param("bio") String bio);

    /**
     * アバター画像のURLを更新する。削除時は{@code avatarUrl}に{@code null}を渡す。
     *
     * @return 更新できた件数（0なら対象が存在しない）
     */
    int updateAvatarUrl(@Param("id") Long id, @Param("avatarUrl") String avatarUrl);

    /**
     * ユーザー名・表示名の部分一致でユーザーを検索する。戻り値の形は{@link FollowMapper}の
     * フォロワー・フォロー中一覧と全く同じ（アイコン・表示名・ユーザー名・フォロー済みかどうか）
     * のため、新規entityは作らず{@link UserFollowSummary}をそのまま再利用する。
     *
     * @param keyword 空でないトリム済みの検索キーワード（呼び出し元で保証する）
     * @param currentUserId ログイン中の利用者のid。{@code followedByMe}の判定に使う
     */
    List<UserFollowSummary> searchByKeyword(@Param("keyword") String keyword, @Param("currentUserId") Long currentUserId);
}
