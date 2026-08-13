package com.raisetechsns.backend.storage;

import java.io.IOException;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * {@link StorageService}のAmazon S3実装（ローカル開発ではS3互換のMinIOに接続する。
 * {@link com.raisetechsns.backend.config.S3Config}参照）。オブジェクトキーはUUIDで採番し、
 * 既存ファイルとの衝突・上書きを避ける。
 *
 * <p>返す画像URLは常にpath-style（{@code {ベースURL}/{バケット名}/{key}}）で組み立てる。
 * {@code S3Config}側で{@code forcePathStyle(true)}にしているS3クライアントの挙動と一致させるため。
 */
@Service
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final S3Properties properties;
    private final String publicBaseUrl;

    public S3StorageService(S3Client s3Client, S3Properties properties) {
        this.s3Client = s3Client;
        this.properties = properties;
        // endpointが指定されていればそちら（ローカル開発のMinIO）、無ければ実際のAmazon S3の
        // リージョン別path-styleエンドポイントを使う
        this.publicBaseUrl = StringUtils.hasText(properties.endpoint())
                ? properties.endpoint()
                : "https://s3.%s.amazonaws.com".formatted(properties.region());
    }

    @Override
    public String upload(String folder, MultipartFile file) {
        String key = folder + "/" + UUID.randomUUID() + extensionOf(file.getContentType());
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(properties.bucket())
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to read uploaded file", e);
        }
        return "%s/%s/%s".formatted(publicBaseUrl, properties.bucket(), key);
    }

    @Override
    public void delete(String imageUrl) {
        if (imageUrl == null) {
            return;
        }
        String marker = "/" + properties.bucket() + "/";
        int index = imageUrl.indexOf(marker);
        if (index < 0) {
            return;
        }
        String key = imageUrl.substring(index + marker.length());
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(properties.bucket()).key(key).build());
    }

    private String extensionOf(String contentType) {
        return "image/png".equals(contentType) ? ".png" : ".jpg";
    }
}
