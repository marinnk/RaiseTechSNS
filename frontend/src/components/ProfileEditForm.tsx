import { useState } from 'react';
import { MAX_BIO_LENGTH, isValidBio } from '../utils/profileBio';

interface ProfileEditFormProps {
  initialBio: string;
  submitting: boolean;
  onCancel: () => void;
  onSave: (bio: string) => Promise<boolean>;
}

// S06 プロフィール編集画面。今バージョンでは自己紹介（160文字まで）のみ編集可能とする。
// アイコン画像のアップロード（S3連携）は別Issueで対応する。
export function ProfileEditForm({ initialBio, submitting, onCancel, onSave }: ProfileEditFormProps) {
  const [bio, setBio] = useState(initialBio);
  const canSave = isValidBio(bio) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await onSave(bio);
  };

  return (
    <form className="profile-edit-form" onSubmit={handleSubmit}>
      <h1 className="profile-edit-title">プロフィールを編集</h1>
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
