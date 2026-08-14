import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PostImageGrid } from './PostImageGrid';
import type { PostImage } from '../types/post';

function images(count: number): PostImage[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, imageUrl: `https://example.com/${i + 1}.jpg` }));
}

describe('PostImageGrid', () => {
  it('画像が0枚のときは何も表示しない', () => {
    const { container } = render(<PostImageGrid images={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each([1, 2, 3, 4])('画像が%d枚のとき、count-%dクラスが付き%d枚とも表示される', (count) => {
    render(<PostImageGrid images={images(count)} />);

    expect(document.querySelector(`.post-images.count-${count}`)).toBeInTheDocument();
    expect(screen.getAllByAltText('投稿画像')).toHaveLength(count);
  });

  it('各画像のsrcにimageUrlが設定される', () => {
    render(<PostImageGrid images={[{ id: 1, imageUrl: 'https://example.com/a.jpg' }]} />);

    expect(screen.getByAltText('投稿画像')).toHaveAttribute('src', 'https://example.com/a.jpg');
  });
});
