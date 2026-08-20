// Playwrightのカスタムフィクスチャ（test.extend）。
//
// 【重要】`user`フィクスチャの登録は共有の`request`フィクスチャ（pageとは別のAPIRequestContext）で
// 行うため、Cookieはpageのブラウザコンテキストとは共有されない。そのため`authedPage`は
// `user`のメールアドレス・パスワードで改めて`page.request`経由のログインを行い、pageのコンテキストに
// Cookieを載せている（`AuthController.register`は登録時点でログインと同じくCookieを発行するが、
// それはあくまで登録に使ったコンテキスト内でのみ有効なため）。

import { test as base, expect, type Page } from '@playwright/test';
import { loginViaApi, registerUser } from './api';
import type { TestUser } from './testUser';

interface Fixtures {
  user: TestUser;
  authedPage: Page;
  secondUser: TestUser;
  secondUserPage: Page;
}

async function waitForTimelineReady(page: Page) {
  // App.tsxはsessionStatus==='checking'の間「読み込み中...」を表示する。ログイン済み状態が
  // 安定してから後続の操作に入るため、タイムライン画面の目印（投稿作成ボタン）を待つ
  await expect(page.getByRole('button', { name: '投稿を作成する' })).toBeVisible();
}

export const test = base.extend<Fixtures>({
  user: async ({ request }, use) => {
    const user = await registerUser(request);
    await use(user);
  },

  authedPage: async ({ page, user }, use) => {
    await loginViaApi(page.request, user);
    await page.goto('/');
    await waitForTimelineReady(page);
    await use(page);
  },

  // フォロー・いいね・コメントなど「別ユーザーとして操作する」シナリオ用に、
  // 独立したブラウザコンテキストで2人目のユーザーを用意する
  secondUser: async ({ browser }, use) => {
    const context = await browser.newContext();
    const user = await registerUser(context.request);
    await use(user);
    await context.close();
  },

  secondUserPage: async ({ browser, secondUser }, use) => {
    const context = await browser.newContext();
    await loginViaApi(context.request, secondUser);
    const page = await context.newPage();
    await page.goto('/');
    await waitForTimelineReady(page);
    await use(page);
    await context.close();
  },
});

export { expect };
