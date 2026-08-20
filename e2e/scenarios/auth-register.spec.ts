// UC01 会員登録する（docs/functional-requirements.md）

import { test, expect } from '../support/fixtures';
import { registerUser } from '../support/api';
import { randomE2eUsername } from '../support/testUser';
import { loginScreen, signupScreen } from '../support/selectors';

test.describe('会員登録', () => {
  test('ユーザー名・メールアドレス・パスワードを入力して登録すると、タイムライン画面に遷移する', async ({
    page,
  }) => {
    const username = randomE2eUsername();
    const email = `${username}@example.com`;

    await page.goto('/');
    await loginScreen.signupLink(page).click();

    await signupScreen.usernameInput(page).fill(username);
    await signupScreen.emailInput(page).fill(email);
    await signupScreen.passwordInput(page).fill('E2ePassw0rd!');
    await signupScreen.submitButton(page).click();

    await expect(page.getByRole('button', { name: '投稿を作成する' })).toBeVisible();
    // ヘッダーにはユーザー名初期値（表示名の初期値はユーザー名。AuthService.register参照）が出る
    await expect(page.getByRole('button', { name: new RegExp(username) })).toBeVisible();
  });

  test('既に登録済みのメールアドレスで登録しようとすると、エラーが表示され画面遷移しない', async ({
    page,
    request,
  }) => {
    const existing = await registerUser(request);

    await page.goto('/');
    await loginScreen.signupLink(page).click();

    await signupScreen.usernameInput(page).fill(randomE2eUsername());
    await signupScreen.emailInput(page).fill(existing.email);
    await signupScreen.passwordInput(page).fill('E2ePassw0rd!');
    await signupScreen.submitButton(page).click();

    await expect(page.getByRole('alert')).toBeVisible();
    // タイムラインへ遷移していない（新規登録フォームのままである）ことを確認
    await expect(signupScreen.submitButton(page)).toBeVisible();
  });
});
