import { useState } from 'react';
import { PostContentInput } from './PostContentInput';

interface PostEditFormProps {
  initialContent: string;
  submitting: boolean;
  onCancel: () => void;
  onSave: (content: string) => Promise<void>;
}

/**
 * 投稿の編集フォーム。Modalの中身として使う。
 */
export function PostEditForm({ initialContent, submitting, onCancel, onSave }: PostEditFormProps) {
  const [content, setContent] = useState(initialContent);
  const canSave = content.trim().length > 0 && content.length <= 280 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    await onSave(content.trim());
  };

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <h2 className="modal-title">投稿を編集</h2>
      <PostContentInput id="post-edit-content" value={content} onChange={setContent} disabled={submitting} />
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
