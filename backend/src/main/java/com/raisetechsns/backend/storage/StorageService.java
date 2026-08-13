package com.raisetechsns.backend.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * 画像ファイルの保存先を抽象化する入口。現在の実装はAmazon S3（{@link S3StorageService}）のみだが、
 * インターフェースとして切り出しておくことで、Controller/Serviceの統合テストではS3に接続せず
 * フェイク実装（テスト用のモック）に差し替えられるようにする。
 */
public interface StorageService {

    /**
     * 画像をアップロードし、アクセス可能なURLを返す。
     *
     * @param folder 保存先のプレフィックス（例："avatars"）。将来投稿画像を追加する際は"posts"等を使う想定
     * @param file アップロードするファイル（形式・サイズの検証は呼び出し側で完了している前提）
     * @return アップロード後の画像URL
     */
    String upload(String folder, MultipartFile file);

    /**
     * 指定したURLの画像を削除する。imageUrlがnull、または既に存在しない場合もエラーにしない（冪等）。
     */
    void delete(String imageUrl);
}
