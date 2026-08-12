import { useState } from 'react';
import { PostContentInput } from './PostContentInput';
import { isValidPostContent } from '../utils/postContent';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<boolean>;
  submitting: boolean;
}

export function CommentForm({ onSubmit, submitting }: CommentFormProps) {
  const [content, setContent] = useState('');
  const canSubmit = isValidPostContent(content) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await onSubmit(content.trim());
    if (ok) setContent('');
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <PostContentInput
        id="comment-form-content"
        value={content}
        onChange={setContent}
        disabled={submitting}
        ariaLabel="コメント内容"
        placeholder="コメントを追加..."
      />
      <div className="post-form-footer">
        <button type="submit" className="btn" disabled={!canSubmit}>
          コメントする
        </button>
      </div>
    </form>
  );
}
