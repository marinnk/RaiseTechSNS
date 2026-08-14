package com.raisetechsns.backend.support;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.raisetechsns.backend.entity.Post;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.PostMapper;
import com.raisetechsns.backend.mapper.UserMapper;

/**
 * 実DB（PostgreSQL）が必要なテストの共通基底クラス。
 *
 * {@code docker-compose.yml}の{@code db}サービス（開発用DB）には一切接続せず、テスト実行のたびに
 * Testcontainersが使い捨てのPostgreSQLコンテナを自動起動し、そこにFlywayの本物のマイグレーションを
 * そのまま適用する。開発中のデータを一切壊さずに、実際のSQL（ON CONFLICT・ILIKE等）を本物のPostgreSQL
 * で検証できる。
 *
 * あえて{@code @Testcontainers}・{@code @Container}は使わない。これらのJUnit5拡張はコンテナの
 * 起動・停止をテストクラスごとの{@code beforeAll}/{@code afterAll}にひも付けるため、この基底クラスを
 * 継承する複数のテストクラスをまたいで実行すると「あるクラスの実行後にコンテナが一度停止し、次の
 * クラスの実行時に別ポートで再起動される」状態になり、Spring側でキャッシュされた古いポートの接続情報
 * を使っているテストクラスが接続エラーになる（実際にこの問題が発生することを、複数のControllerテスト
 * クラスを連続実行して`docker ps`でコンテナの入れ替わりを観察し、切り分けた上で確認している）。
 *
 * 代わりに、static初期化ブロックでコンテナを1回だけ起動し、明示的な停止は行わない
 * 「シングルトンコンテナパターン」を使う。static初期化ブロックはこのクラスが最初にロードされた
 * ときに一度だけ実行されるため、これを継承する全テストクラスがJVM内で同一のコンテナ・同一の
 * 接続情報を使い続けることになる。{@code @ServiceConnection}により、コンテナの接続情報
 * （URL・ユーザー名・パスワード）は{@code application.properties}を書き換えることなくSpringの
 * {@code DataSource}へ自動注入される。
 *
 * 明示的な停止をしない後片付けは、Testcontainersが裏で自動起動するRyukコンテナに委ねている。
 * RyukはこのJVMプロセスの終了を検知してコンテナを削除するが、Ryukが無効化・利用不可な環境
 * （{@code TESTCONTAINERS_RYUK_DISABLED=true}を設定したCI・rootless Docker環境等）では
 * この自動削除は働かず、コンテナが残り続ける点に注意。
 *
 * static初期化ブロックはこのクラスの初回ロード時に1回しか実行されないため、ここでコンテナの
 * 起動に失敗すると（Dockerデーモン未起動・イメージ取得失敗等）、同じJVM内でこのクラスを継承する
 * 以降の全テストクラスが{@code NoClassDefFoundError}で失敗する。原因が「Dockerが起動していない」
 * ことだと分かりにくいエラーになるので、大量のテストクラスが軒並み{@code NoClassDefFoundError}で
 * 落ちたときは、まずDockerデーモンが起動しているかを疑うこと。
 */
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PostMapper postMapper;

    /**
     * テスト用の利用者を1件登録して、採番されたidを返す。メールアドレス・パスワードハッシュ・
     * 表示名は全てのMapperテストで共通の機械的な値（利用者名から導出）でよいため、
     * ここに1箇所だけ用意し、各Mapperテストで重複して定義しない。
     */
    protected Long insertUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("hashed-password");
        user.setDisplayName(username + "の表示名");
        userMapper.insert(user);
        return user.getId();
    }

    /**
     * テスト用の投稿を1件登録して、採番されたidを返す。
     */
    protected Long insertPost(Long userId, String content) {
        Post post = new Post();
        post.setUserId(userId);
        post.setContent(content);
        postMapper.insert(post);
        return post.getId();
    }
}
