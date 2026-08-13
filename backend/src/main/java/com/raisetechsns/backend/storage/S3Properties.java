package com.raisetechsns.backend.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * S3連携の設定値。バケット名・リージョンは環境変数（AWS_S3_BUCKET/AWS_REGION）から注入する。
 * 認証情報（アクセスキー等）はAWS SDKの標準認証情報チェーンに委ねるため、ここには含めない。
 */
@ConfigurationProperties(prefix = "app.s3")
public record S3Properties(String bucket, String region) {
}
