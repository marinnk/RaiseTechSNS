// 画面ごとの小さなロケーターヘルパー。
//
// フロントエンドにはdata-testidが一切無く、既存のVitest+RTLテストも`getByRole`/`getByLabelText`を
// 日本語の正確な文言で直接使う流儀を踏襲している（frontend/src/components/*.test.tsx）。
// このファイルはその流儀を変えるものではなく、複数specファイルで繰り返し使う文言・構造を
// 1箇所にまとめておき、UI文言が変わったときの修正箇所を減らすための薄いヘルパーに過ぎない
// （page-object的な重い抽象化は意図的に避けている。specの中で直接getByRole等を書いてもよい）。

import type { Locator, Page } from '@playwright/test';

type Scope = Page | Locator;

export const loginScreen = {
  emailInput: (page: Page) => page.getByLabel('メールアドレス'),
  passwordInput: (page: Page) => page.getByLabel('パスワード'),
  submitButton: (page: Page) => page.getByRole('button', { name: 'ログイン' }),
  signupLink: (page: Page) => page.getByRole('button', { name: '新規登録はこちら' }),
};

export const signupScreen = {
  usernameInput: (page: Page) => page.getByLabel('ユーザー名'),
  emailInput: (page: Page) => page.getByLabel('メールアドレス'),
  passwordInput: (page: Page) => page.getByLabel('パスワード'),
  submitButton: (page: Page) => page.getByRole('button', { name: '登録する' }),
  loginLink: (page: Page) => page.getByRole('button', { name: 'ログイン画面に戻る' }),
};

export const header = {
  searchButton: (page: Page) => page.getByRole('button', { name: '検索' }),
  logoutButton: (page: Page) => page.getByRole('button', { name: 'ログアウト' }),
  // ヘッダーのアイコン＋表示名ボタン（自分のプロフィールを開く）。ボタン名は表示名を含むため、
  // 完全一致ではなく「timeline-header-user」というクラスを持つ唯一のボタンをtimeline-headerの
  // 範囲内から取る
  ownProfileButton: (page: Page) => page.locator('.timeline-header').locator('.timeline-header-user'),
  createPostButton: (scope: Scope) => scope.getByRole('button', { name: '投稿を作成する' }),
  tab: (page: Page, name: '全体' | 'フォロー中') => page.getByRole('tab', { name }),
};

// 投稿作成・編集はモーダル（role="dialog"）の中で行われる。ariaLabelでモーダルを特定し、
// その中のフォーム要素をスコープして操作する（複数の投稿が並ぶ一覧の中でも文言が衝突しない）。
export const modal = (page: Page, ariaLabel: string) => page.getByRole('dialog', { name: ariaLabel });

export const postForm = {
  // PostForm・PostEditForm共通のテキストエリア（PostContentInputの既定aria-labelは「投稿内容」）
  contentInput: (scope: Scope) => scope.getByLabel('投稿内容'),
  imageFileInput: (scope: Scope) => scope.locator('input[type="file"]'),
  submitButton: (scope: Scope, label: '投稿' | '保存' = '投稿') => scope.getByRole('button', { name: label }),
  cancelButton: (scope: Scope) => scope.getByRole('button', { name: 'キャンセル' }),
};

// タイムライン・プロフィール一覧上の投稿1件（article.post-item）。本文の一部でスコープする。
export function postItem(page: Page, contentSnippet: string): Locator {
  return page.locator('.post-item', { hasText: contentSnippet });
}

export const postItemActions = {
  authorButton: (item: Locator) => item.locator('.post-author'),
  editLink: (item: Locator) => item.getByRole('button', { name: '編集' }),
  deleteLink: (item: Locator) => item.getByRole('button', { name: '削除' }),
  likeButton: (item: Locator) => item.locator('.like-button'),
  commentLink: (item: Locator) => item.locator('.comment-link'),
};

export const postDetailScreen = {
  backLink: (page: Page) => page.getByRole('button', { name: /タイムラインに戻る|プロフィールに戻る/ }),
  commentsHeading: (page: Page) => page.getByRole('heading', { name: 'コメント' }),
  commentInput: (page: Page) => page.getByLabel('コメント内容'),
  commentSubmitButton: (page: Page) => page.getByRole('button', { name: 'コメントする' }),
};

export const profileScreen = {
  backLink: (page: Page) => page.getByRole('button', { name: '← タイムラインに戻る' }),
  editProfileButton: (page: Page) => page.getByRole('button', { name: 'プロフィールを編集' }),
  followToggleButton: (page: Page) => page.getByRole('button', { name: /^(フォローする|フォロー中)$/ }),
  followingCountButton: (page: Page) => page.locator('.follow-count-button', { hasText: 'フォロー中' }),
  followerCountButton: (page: Page) => page.locator('.follow-count-button', { hasText: 'フォロワー' }),
  followListItem: (page: Page, displayNameSnippet: string) =>
    page.locator('.follow-list-item', { hasText: displayNameSnippet }),
};

export const profileEditScreen = {
  avatarFileInput: (page: Page) => page.getByLabel('アイコン画像を選択'),
  removeAvatarLink: (page: Page) => page.getByRole('button', { name: '画像を削除' }),
  bioInput: (page: Page) => page.getByLabel(/^自己紹介/),
  cancelButton: (page: Page) => page.getByRole('button', { name: 'キャンセル' }),
  saveButton: (page: Page) => page.getByRole('button', { name: '保存' }),
};

export const searchScreen = {
  keywordInput: (page: Page) => page.getByLabel('ユーザー名・表示名で検索'),
  // ヘッダーの「検索」リンクボタンと文言が重複するため、role="search"のフォーム内に限定する
  submitButton: (page: Page) => page.getByRole('search').getByRole('button', { name: '検索' }),
  resultItem: (page: Page, snippet: string) => page.locator('.search-result-item', { hasText: snippet }),
};
