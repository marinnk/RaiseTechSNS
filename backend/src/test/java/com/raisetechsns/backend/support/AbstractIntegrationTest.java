package com.raisetechsns.backend.support;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;

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
 * を使っているテストクラスが接続エラーになる（実際にこの問題が発生することを確認済み）。
 *
 * 代わりに、static初期化ブロックでコンテナを1回だけ起動し、明示的な停止は行わない
 * （Testcontainersが裏で自動起動するRyukコンテナが、このJVMプロセスの終了を検知して
 * 後片付けする）「シングルトンコンテナパターン」を使う。static初期化ブロックはこのクラスが
 * 最初にロードされたときに一度だけ実行されるため、これを継承する全テストクラスがJVM内で
 * 同一のコンテナ・同一の接続情報を使い続けることになる。{@code @ServiceConnection}により、
 * コンテナの接続情報（URL・ユーザー名・パスワード）は{@code application.properties}を書き換える
 * ことなくSpringの{@code DataSource}へ自動注入される。
 */
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    static {
        POSTGRES.start();
    }
}
