import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PostContentInput } from './PostContentInput';
import { MAX_POST_CONTENT_LENGTH } from '../utils/postContent';

describe('PostContentInput', () => {
  it('デフォルトでは「投稿内容」というラベルとplaceholder・maxLength属性を持つtextareaを表示する', () => {
    render(<PostContentInput id="content" value="" onChange={vi.fn()} />);

    const textarea = screen.getByLabelText('投稿内容');
    expect(textarea).toHaveAttribute('maxlength', String(MAX_POST_CONTENT_LENGTH));
    expect(textarea).toHaveAttribute('placeholder', `今何してる？（${MAX_POST_CONTENT_LENGTH}文字まで）`);
  });

  it('ariaLabel・placeholderを渡すとそちらが使われる（コメント欄での再利用を想定）', () => {
    render(
      <PostContentInput
        id="comment-content"
        value=""
        onChange={vi.fn()}
        ariaLabel="コメント内容"
        placeholder="コメントを追加..."
      />,
    );

    expect(screen.getByLabelText('コメント内容')).toHaveAttribute('placeholder', 'コメントを追加...');
  });

  it('valueが表示され、文字数カウンタにも反映される', () => {
    render(<PostContentInput id="content" value="こんにちは" onChange={vi.fn()} />);

    expect(screen.getByLabelText('投稿内容')).toHaveValue('こんにちは');
    expect(screen.getByText(`5/${MAX_POST_CONTENT_LENGTH}`)).toBeInTheDocument();
  });

  it('入力するとonChangeが新しい値で呼ばれる', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PostContentInput id="content" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('投稿内容'), 'あ');

    expect(onChange).toHaveBeenCalledWith('あ');
  });

  it('disabledを渡すとtextareaが非活性になる', () => {
    render(<PostContentInput id="content" value="" onChange={vi.fn()} disabled />);

    expect(screen.getByLabelText('投稿内容')).toBeDisabled();
  });
});
