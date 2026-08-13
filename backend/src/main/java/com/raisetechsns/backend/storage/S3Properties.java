package com.raisetechsns.backend.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3連携の設定値。
 *
 * <p>ローカル開発では、実際のAmazon S3の代わりにdocker-composeで起動するS3互換ストレージ
 * （MinIO）に接続する。{@code endpoint}を指定するとそちらへ向き（{@code pathStyleAccess}も
 * 併せてtrueにする必要がある）、空にすると実際のAmazon S3（リージョンに応じた標準エンドポイント）
 * を使う。認証情報は本番相当の環境ではIAMユーザーの値に必ず上書きすること。
 */
@ConfigurationProperties(prefix = "app.s3")
public record S3Properties(
        String bucket,
        String region,
        String endpoint,
        boolean pathStyleAccess,
        String accessKeyId,
        String secretAccessKey) {
}
