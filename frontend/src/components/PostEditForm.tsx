import { useState } from 'react';
import { PostContentInput } from './PostContentInput';
import { PostImagePicker } from './PostImagePicker';
import { isValidPostContent } from '../utils/postContent';
import type { PostImage } from '../types/post';

interface PostEditFormProps {
  initialContent: string;
  initialImages: PostImage[];
  submitting: boolean;
  onCancel: () => void;
  onSave: (content: string, keepImageIds: number[], newImages: File[]) => Promise<void>;
}

/**
 * 投稿の編集フォーム。Modalの中身として使う。既存画像は削除でき、新規画像も追加できる
 * （合計で最大4枚）。
 */
export function PostEditForm({ initialContent, initialImages, submitting, onCancel, onSave }: PostEditFormProps) {
  const [content, setContent] = useState(initialContent);
  // 残す既存画像。削除ボタンで取り除かれた分は保存時にkeepImageIdsへ含めない
  const [keptImages, setKeptImages] = useState<PostImage[]>(initialImages);
  const [newImages, setNewImages] = useState<File[]>([]);
  const canSave = isValidPostContent(content) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await onSave(
      content.trim(),
      keptImages.map((image) => image.id),
      newImages,
    );
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <h2 className="modal-title">投稿を編集</h2>
      <PostContentInput id="post-edit-content" value={content} onChange={setContent} disabled={submitting} />

      <PostImagePicker
        existingImages={keptImages.map((image) => ({ id: image.id, url: image.imageUrl }))}
        newImages={newImages}
        onRemoveExisting={(id) => setKeptImages((prev) => prev.filter((image) => image.id !== id))}
        onAddFiles={(files) => setNewImages((prev) => [...prev, ...files])}
        onRemoveNew={(index) => setNewImages((prev) => prev.filter((_, i) => i !== index))}
        disabled={submitting}
      />

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
