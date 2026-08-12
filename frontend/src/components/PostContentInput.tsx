interface PostContentInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 投稿の作成・編集フォームで共通して使う、280文字カウンタ付きのテキストエリア。
 */
export function PostContentInput({ id, value, onChange, disabled }: PostContentInputProps) {
  return (
    <div className="post-content-input">
      <textarea
        id={id}
        aria-label="投稿内容"
        placeholder="今何してる？（280文字まで）"
        maxLength={280}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="field-hint">{value.length}/280</p>
    </div>
  );
}
