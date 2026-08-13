import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserSearchScreen } from './UserSearchScreen';
import type { UserSearchResult } from '../types/user';

function user(overrides: Partial<UserSearchResult> = {}): UserSearchResult {
  return {
    id: 1,
    username: 'jiro',
    displayName: '次郎',
    avatarUrl: null,
    followedByMe: false,
    ...overrides,
  };
}

function renderScreen(overrides: Partial<React.ComponentProps<typeof UserSearchScreen>> = {}) {
  const props: React.ComponentProps<typeof UserSearchScreen> = {
    keyword: '',
    onKeywordChange: vi.fn(),
    results: [],
    hasSearched: false,
    loading: false,
    onSearch: vi.fn(),
    onBack: vi.fn(),
    onOpenProfile: vi.fn(),
    ...overrides,
  };
  render(<UserSearchScreen {...props} />);
  return props;
}

describe('UserSearchScreen', () => {
  it('フォーム送信時にonSearchがキーワードで呼ばれる', async () => {
    const userEventInstance = userEvent.setup();
    const onSearch = vi.fn();
    renderScreen({ keyword: 'jiro', onSearch });

    await userEventInstance.click(screen.getByRole('button', { name: '検索' }));

    expect(onSearch).toHaveBeenCalledWith('jiro');
  });

  it('検索結果が一覧表示され、クリックでonOpenProfileが呼ばれる', async () => {
    const userEventInstance = userEvent.setup();
    const onOpenProfile = vi.fn();
    renderScreen({ results: [user({ id: 2, displayName: '次郎', username: 'jiro' })], hasSearched: true, onOpenProfile });

    expect(screen.getByText('次郎')).toBeInTheDocument();
    expect(screen.getByText('@jiro')).toBeInTheDocument();

    await userEventInstance.click(screen.getByRole('button', { name: /次郎/ }));

    expect(onOpenProfile).toHaveBeenCalledWith(2);
  });

  it('検索済みで該当なしの場合はその旨を表示する', () => {
    renderScreen({ results: [], hasSearched: true });

    expect(screen.getByText('該当する利用者が見つかりませんでした。')).toBeInTheDocument();
  });

  it('検索前は該当なしメッセージを表示しない', () => {
    renderScreen({ results: [], hasSearched: false });

    expect(screen.queryByText('該当する利用者が見つかりませんでした。')).not.toBeInTheDocument();
  });

  it('読み込み中は読み込み中メッセージを表示する', () => {
    renderScreen({ loading: true });

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('戻るリンククリックでonBackが呼ばれる', async () => {
    const userEventInstance = userEvent.setup();
    const onBack = vi.fn();
    renderScreen({ onBack });

    await userEventInstance.click(screen.getByRole('button', { name: '← タイムラインに戻る' }));

    expect(onBack).toHaveBeenCalled();
  });
});
