package com.raisetechsns.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import com.raisetechsns.backend.storage.S3Properties;

/**
 * S3クライアントのBean定義。認証情報（アクセスキー等）は明示的に指定せず、
 * AWS SDKの標準認証情報チェーン（環境変数AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY、
 * ~/.aws/credentials、EC2/ECSのインスタンスロール等）に委ねる。
 */
@Configuration
@EnableConfigurationProperties(S3Properties.class)
public class S3Config {

    @Bean
    public S3Client s3Client(S3Properties properties) {
        return S3Client.builder()
                .region(Region.of(properties.region()))
                .build();
    }
}
