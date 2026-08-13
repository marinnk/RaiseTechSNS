import { useState } from 'react';
import { AvatarIcon } from './AvatarIcon';
import { PostContentInput } from './PostContentInput';
import { PostImagePicker } from './PostImagePicker';
import { isValidPostContent } from '../utils/postContent';

interface PostFormProps {
  avatarUrl: string | null;
  onSubmit: (content: string, images: File[]) => Promise<boolean>;
  submitting: boolean;
  // 投稿フォームの自分のアイコンをクリックしたときに自分のプロフィール画面へ遷移させる
  onOpenProfile: () => void;
}

export function PostForm({ avatarUrl, onSubmit, submitting, onOpenProfile }: PostFormProps) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const canSubmit = isValidPostContent(content) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onSubmit(content.trim(), images);
    if (ok) {
      setContent('');
      setImages([]);
    }
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <div className="post-form-body">
        <button type="button" className="avatar-icon-button" onClick={onOpenProfile} aria-label="自分のプロフィールを表示">
          <AvatarIcon avatarUrl={avatarUrl} />
        </button>
        <PostContentInput id="post-form-content" value={content} onChange={setContent} disabled={submitting} />
      </div>

      <PostImagePicker
        existingImages={[]}
        newImages={images}
        onRemoveExisting={() => {}}
        onAddFiles={(files) => setImages((prev) => [...prev, ...files])}
        onRemoveNew={(index) => setImages((prev) => prev.filter((_, i) => i !== index))}
        disabled={submitting}
      />

      <div className="post-form-footer">
        <button type="submit" className="btn" disabled={!canSubmit}>
          投稿
        </button>
      </div>
    </form>
  );
}
