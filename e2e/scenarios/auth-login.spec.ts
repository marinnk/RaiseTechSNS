// UC02 ログインする（docs/functional-requirements.md）＋未ログイン時のガード・ログアウト

import { test, expect } from '../support/fixtures';
import { registerUser } from '../support/api';
import { loginScreen, header } from '../support/selectors';

test.describe('ログイン', () => {
  test('正しいメールアドレス・パスワードでログインすると、タイムライン画面に遷移する', async ({
    page,
    request,
  }) => {
    const user = await registerUser(request);

    await page.goto('/');
    await loginScreen.emailInput(page).fill(user.email);
    await loginScreen.passwordInput(page).fill(user.password);
    await loginScreen.submitButton(page).click();

    await expect(page.getByRole('button', { name: '投稿を作成する' })).toBeVisible();
  });

  test('誤ったパスワードでログインしようとすると、エラーが表示されログイン画面のままになる', async ({
    page,
    request,
  }) => {
    const user = await registerUser(request);

    await page.goto('/');
    await loginScreen.emailInput(page).fill(user.email);
    await loginScreen.passwordInput(page).fill('wrong-password');
    await loginScreen.submitButton(page).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(loginScreen.submitButton(page)).toBeVisible();
  });

  test('未ログインで開くと常にログイン画面になる', async ({ page }) => {
    await page.goto('/');
    await expect(loginScreen.submitButton(page)).toBeVisible();
  });
});

test.describe('ログアウト', () => {
  test('ログアウトするとログイン画面に戻り、以後のAPI呼び出しは未認証になる', async ({ authedPage }) => {
    const page = authedPage;

    await header.logoutButton(page).click();

    await expect(loginScreen.submitButton(page)).toBeVisible();

    // 未認証状態でリロードしても、タイムラインではなくログイン画面のままであることを確認する
    await page.reload();
    await expect(loginScreen.submitButton(page)).toBeVisible();
  });
});
