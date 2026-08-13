package com.raisetechsns.backend.storage;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
     * @param folder 保存先のプレフィックス（例："avatars"・"posts"）
     * @param file アップロードするファイル（形式・サイズの検証は呼び出し側で完了している前提）
     * @return アップロード後の画像URL
     */
    String upload(String folder, MultipartFile file);

    /**
     * 指定したURLの画像を削除する。imageUrlがnull、または既に存在しない場合もエラーにしない（冪等）。
     */
    void delete(String imageUrl);

    /**
     * 現在のトランザクションがコミットされた後に画像を削除する。プロフィール画像・投稿画像のどちらも、
     * 「DBの更新（どのURLが今の画像か）」と「S3からの削除」を1つの{@code @Transactional}メソッド内で
     * 行う。途中でS3を削除してしまうと、その後の処理が失敗してトランザクションがロールバックされた
     * 場合に、まだ参照されているはずの画像が既に消えている状態になりかねないため、削除は必ず
     * コミット後まで遅らせる。{@code imageUrl}が{@code null}の場合は何もしない。
     */
    default void deleteAfterCommit(String imageUrl) {
        if (imageUrl == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // トランザクション外から呼ばれることは通常無いが、保険として即時削除する
            delete(imageUrl);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                delete(imageUrl);
            }
        });
    }
}
