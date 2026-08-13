import { useEffect, useRef, useState } from 'react';
import { MAX_BIO_LENGTH, isValidBio } from '../utils/profileBio';
import { validateImageFile } from '../utils/imageFile';

interface ProfileEditFormProps {
  initialBio: string;
  avatarUrl: string | null;
  submitting: boolean;
  avatarSubmitting: boolean;
  onCancel: () => void;
  onSave: (bio: string) => Promise<boolean>;
  onUploadAvatar: (file: File) => Promise<boolean>;
  onRemoveAvatar: () => Promise<boolean>;
}

// S06 プロフィール編集画面。自己紹介（160文字まで）とアバター画像（jpg/png、5MB以下）を編集できる。
// アバター画像は選択した時点で即座にアップロードされ、bioの保存とはライフサイクルが独立している
// （保存ボタンはbioの保存にのみ使う）。
export function ProfileEditForm({
  initialBio,
  avatarUrl,
  submitting,
  avatarSubmitting,
  onCancel,
  onSave,
  onUploadAvatar,
  onRemoveAvatar,
}: ProfileEditFormProps) {
  const [bio, setBio] = useState(initialBio);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSave = isValidBio(bio) && !submitting;

  // アップロード成功後（avatarUrlがサーバー側の値に更新された後）は、ローカルプレビューは不要になる
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await onSave(bio);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }
    setAvatarError(null);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    const success = await onUploadAvatar(file);
    if (!success) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    const success = await onRemoveAvatar();
    if (success) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  };

  const displayedAvatarUrl = previewUrl ?? avatarUrl;

  return (
    <form className="profile-edit-form" onSubmit={handleSubmit}>
      <h1 className="profile-edit-title">プロフィールを編集</h1>

      <div className="avatar-edit">
        {displayedAvatarUrl ? (
          <img src={displayedAvatarUrl} alt="アイコンのプレビュー" className="profile-avatar profile-avatar-lg" />
        ) : (
          <div className="profile-avatar profile-avatar-lg profile-avatar-placeholder" aria-hidden="true" />
        )}
        <div className="avatar-edit-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            aria-label="アイコン画像を選択"
            className="avatar-edit-input"
            disabled={avatarSubmitting}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn btn-outline"
            disabled={avatarSubmitting}
            onClick={() => fileInputRef.current?.click()}
          >
            画像を選択
          </button>
          {avatarUrl && (
            <button type="button" className="link-button" disabled={avatarSubmitting} onClick={handleRemoveAvatar}>
              画像を削除
            </button>
          )}
        </div>
        {avatarError && (
          <div className="form-error" role="alert">
            {avatarError}
          </div>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="profile-edit-bio">自己紹介（{MAX_BIO_LENGTH}文字まで）</label>
        <textarea
          id="profile-edit-bio"
          className="profile-edit-bio-input"
          value={bio}
          disabled={submitting}
          maxLength={MAX_BIO_LENGTH}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="field-hint">
          {bio.length}/{MAX_BIO_LENGTH}
        </p>
      </div>
      <div className="post-form-footer">
        <button type="button" className="link-button" onClick={onCancel} disabled={submitting}>
          キャンセル
        </button>
        <button type="submit" className="btn" disabled={!canSave}>
          保存
        </button>
      </div>
    </form>
  );
}
