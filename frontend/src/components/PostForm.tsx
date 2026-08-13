import { useState } from 'react';
import { PostContentInput } from './PostContentInput';
import { isValidPostContent } from '../utils/postContent';

interface PostFormProps {
  avatarUrl: string | null;
  onSubmit: (content: string) => Promise<boolean>;
  submitting: boolean;
  // 投稿フォームの自分のアイコンをクリックしたときに自分のプロフィール画面へ遷移させる
  onOpenProfile: () => void;
}

export function PostForm({ avatarUrl, onSubmit, submitting, onOpenProfile }: PostFormProps) {
  const [content, setContent] = useState('');
  const canSubmit = isValidPostContent(content) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onSubmit(content.trim());
    if (ok) setContent('');
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <div className="post-form-body">
        <button type="button" className="avatar-icon-button" onClick={onOpenProfile} aria-label="自分のプロフィールを表示">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-icon-sm" />
          ) : (
            <span className="avatar-icon-sm avatar-icon-placeholder" aria-hidden="true" />
          )}
        </button>
        <PostContentInput id="post-form-content" value={content} onChange={setContent} disabled={submitting} />
      </div>
      <div className="post-form-footer">
        <button type="submit" className="btn" disabled={!canSubmit}>
          投稿
        </button>
      </div>
    </form>
  );
}
