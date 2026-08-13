import { useState } from 'react';
import { PostContentInput } from './PostContentInput';
import { isValidPostContent } from '../utils/postContent';

interface PostFormProps {
  avatarUrl: string | null;
  onSubmit: (content: string) => Promise<boolean>;
  submitting: boolean;
}

export function PostForm({ avatarUrl, onSubmit, submitting }: PostFormProps) {
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
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="avatar-icon-sm" />
        ) : (
          <span className="avatar-icon-sm avatar-icon-placeholder" aria-hidden="true" />
        )}
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
