import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarIcon } from './AvatarIcon';

describe('AvatarIcon', () => {
  it('avatarUrlがあれば装飾用画像（alt=""）を表示する', () => {
    render(<AvatarIcon avatarUrl="https://example.com/avatars/a.jpg" />);

    const img = document.querySelector('img.avatar-icon-sm');
    expect(img).toHaveAttribute('src', 'https://example.com/avatars/a.jpg');
    expect(img).toHaveAttribute('alt', '');
  });

  it('avatarUrlがnullならプレースホルダー（span）を表示し、imgは表示しない', () => {
    render(<AvatarIcon avatarUrl={null} />);

    expect(document.querySelector('img')).not.toBeInTheDocument();
    const placeholder = document.querySelector('span.avatar-icon-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
  });

  it('avatarUrlが空文字（falsy）でもプレースホルダーを表示する', () => {
    render(<AvatarIcon avatarUrl="" />);

    expect(document.querySelector('img')).not.toBeInTheDocument();
    expect(document.querySelector('span.avatar-icon-placeholder')).toBeInTheDocument();
  });
});
