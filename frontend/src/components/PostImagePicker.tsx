import { useState } from 'react';
import { useObjectUrlPreviews } from '../hooks/useObjectUrlPreviews';
import { MAX_POST_IMAGES, validateImageFile } from '../utils/imageFile';

export interface ExistingPostImage {
  id: number;
  url: string;
}

interface PostImagePickerProps {
  // 編集時に残っている既存画像（作成フォームでは常に空配列）
  existingImages: ExistingPostImage[];
  // 新たに選択したファイル（プレビュー用のobject URLはこのコンポーネント内で管理する）
  newImages: File[];
  onRemoveExisting: (id: number) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveNew: (index: number) => void;
  disabled: boolean;
}

// 投稿フォーム（PostForm）・投稿編集フォーム（PostEditForm）で共通して使う画像選択UI。
// ProfileEditFormと同じく選択時にクライアント側で検証（形式・サイズ・残り枚数）し、
// 見た目はプロトタイプ（prototype/js/components/postForm.js・css/style.css）の
// 画像選択ボタン・プレビューグリッドを踏襲する。
export function PostImagePicker({
  existingImages,
  newImages,
  onRemoveExisting,
  onAddFiles,
  onRemoveNew,
  disabled,
}: PostImagePickerProps) {
  const [error, setError] = useState<string | null>(null);
  const newImagePreviews = useObjectUrlPreviews(newImages);

  const remainingSlots = MAX_POST_IMAGES - existingImages.length - newImages.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    if (files.length > remainingSlots) {
      setError(`画像は最大${MAX_POST_IMAGES}枚までです。`);
      return;
    }
    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(null);
    onAddFiles(files);
  };

  return (
    <div className="post-image-picker">
      {(existingImages.length > 0 || newImages.length > 0) && (
        <div className="image-previews">
          {existingImages.map((image) => (
            <div className="image-preview-item" key={`existing-${image.id}`}>
              <img src={image.url} alt="添付画像" />
              <button
                type="button"
                className="image-preview-remove"
                onClick={() => onRemoveExisting(image.id)}
                disabled={disabled}
                aria-label="この画像を削除"
              >
                ×
              </button>
            </div>
          ))}
          {newImagePreviews.map((url, index) => (
            <div className="image-preview-item" key={`new-${index}`}>
              <img src={url} alt="選択中の画像" />
              <button
                type="button"
                className="image-preview-remove"
                onClick={() => onRemoveNew(index)}
                disabled={disabled}
                aria-label="この画像を削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="image-picker-label">
        画像を選択（最大{MAX_POST_IMAGES}枚）
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          disabled={disabled || remainingSlots <= 0}
          onChange={handleFileChange}
        />
      </label>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
