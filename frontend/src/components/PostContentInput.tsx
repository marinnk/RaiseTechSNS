import { MAX_POST_CONTENT_LENGTH } from '../utils/postContent';

interface PostContentInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}

/**
 * 投稿・コメントの作成/編集フォームで共通して使う、280文字カウンタ付きのテキストエリア。
 * コメントも投稿と同じ280文字制限・バリデーションのため、CommentFormからも再利用する。
 */
export function PostContentInput({
  id,
  value,
  onChange,
  disabled,
  ariaLabel = '投稿内容',
  placeholder = `今何してる？（${MAX_POST_CONTENT_LENGTH}文字まで）`,
}: PostContentInputProps) {
  return (
    <div className="post-content-input">
      <textarea
        id={id}
        aria-label={ariaLabel}
        placeholder={placeholder}
        maxLength={MAX_POST_CONTENT_LENGTH}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="field-hint">
        {value.length}/{MAX_POST_CONTENT_LENGTH}
      </p>
    </div>
  );
}
