import { useState } from 'react';
import { PostContentInput } from './PostContentInput';

interface PostFormProps {
  onSubmit: (content: string) => Promise<boolean>;
  submitting: boolean;
}

export function PostForm({ onSubmit, submitting }: PostFormProps) {
  const [content, setContent] = useState('');
  const canSubmit = content.trim().length > 0 && content.length <= 280 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onSubmit(content.trim());
    if (ok) setContent('');
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <PostContentInput id="post-form-content" value={content} onChange={setContent} disabled={submitting} />
      <div className="post-form-footer">
        <button type="submit" className="btn" disabled={!canSubmit}>
          投稿
        </button>
      </div>
    </form>
  );
}
