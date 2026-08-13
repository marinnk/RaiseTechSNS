package com.raisetechsns.backend.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * 実際のAWSには接続せず、{@link S3Client}をモック化してリクエスト内容のみ検証する。
 */
@ExtendWith(MockitoExtension.class)
class S3StorageServiceTest {

    @Mock
    private S3Client s3Client;

    private final S3Properties properties = new S3Properties("test-bucket", "ap-northeast-1");

    @Test
    void upload_bucketを指定してS3に書き込み画像URLを返す() {
        S3StorageService service = new S3StorageService(s3Client, properties);
        MultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", new byte[100]);

        String url = service.upload("avatars", file);

        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        assertThat(captor.getValue().bucket()).isEqualTo("test-bucket");
        assertThat(captor.getValue().key()).startsWith("avatars/").endsWith(".jpg");
        assertThat(url).isEqualTo("https://test-bucket.s3.ap-northeast-1.amazonaws.com/" + captor.getValue().key());
    }

    @Test
    void upload_pngの場合は拡張子pngで保存する() {
        S3StorageService service = new S3StorageService(s3Client, properties);
        MultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[100]);

        service.upload("avatars", file);

        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        assertThat(captor.getValue().key()).endsWith(".png");
    }

    @Test
    void delete_URLからkeyを取り出してdeleteObjectを呼ぶ() {
        S3StorageService service = new S3StorageService(s3Client, properties);

        service.delete("https://test-bucket.s3.ap-northeast-1.amazonaws.com/avatars/abc.jpg");

        ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(captor.capture());
        assertThat(captor.getValue().bucket()).isEqualTo("test-bucket");
        assertThat(captor.getValue().key()).isEqualTo("avatars/abc.jpg");
    }

    @Test
    void delete_nullを渡してもdeleteObjectは呼ばれない() {
        S3StorageService service = new S3StorageService(s3Client, properties);

        service.delete(null);

        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }
}
