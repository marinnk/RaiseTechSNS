// ブラウザパフォーマンステスト：ログイン送信→タイムライン表示までの体感時間
//
// perf-tests/k6/scenarios/auth-login.ts はAPI単体の応答時間（bcryptコストの影響）を見るが、
// こちらはボタンクリックから実際に画面が描画されるまでの、ユーザーが体感する時間を計測する。

import { test, expect } from '../support/fixtures';
import { loginScreen } from '../support/selectors';
import { recordTiming } from '../support/perfTiming';

const THRESHOLD_MS = 2000;

test('ログイン送信からタイムライン表示までの時間', async ({ page, user }, testInfo) => {
  await page.goto('/');
  await loginScreen.emailInput(page).fill(user.email);
  await loginScreen.passwordInput(page).fill(user.password);

  const start = performance.now();
  await loginScreen.submitButton(page).click();
  await expect(page.getByRole('button', { name: '投稿を作成する' })).toBeVisible();
  const elapsed = performance.now() - start;

  await recordTiming(testInfo, 'login-submit-to-timeline', elapsed, THRESHOLD_MS);
  expect(elapsed, `ログイン→タイムライン表示に${elapsed.toFixed(0)}ms（目安${THRESHOLD_MS}ms）`).toBeLessThan(
    THRESHOLD_MS,
  );
});
