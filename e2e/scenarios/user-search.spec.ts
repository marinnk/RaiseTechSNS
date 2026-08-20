// UC09 ユーザーを検索する（docs/functional-requirements.md）

import { test, expect } from '../support/fixtures';
import { header, profileScreen, searchScreen } from '../support/selectors';

test.describe('ユーザー検索', () => {
  test('空欄では検索が実行されず、有効なキーワードでは該当利用者が一覧表示される', async ({
    authedPage: page,
    secondUser,
  }) => {
    let searchRequestCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'GET' && /\/api\/users\?/.test(req.url())) searchRequestCount++;
    });

    await header.searchButton(page).click();

    // 空欄のまま送信しても、検索APIは呼ばれない（結果も「該当なし」メッセージも出ない）
    await searchScreen.submitButton(page).click();
    await expect(page.getByText('該当する利用者が見つかりませんでした。')).toHaveCount(0);
    await expect(page.locator('.search-result-item')).toHaveCount(0);
    expect(searchRequestCount).toBe(0);

    await searchScreen.keywordInput(page).fill(secondUser.username);
    await searchScreen.submitButton(page).click();
    await expect.poll(() => searchRequestCount).toBeGreaterThan(0);

    const result = searchScreen.resultItem(page, secondUser.username);
    await expect(result).toBeVisible();

    await result.click();
    await expect(profileScreen.backLink(page)).toBeVisible();
    await expect(page.getByText(`@${secondUser.username}`)).toBeVisible();
  });

  test('該当する利用者がいない場合はその旨が表示される', async ({ authedPage: page }) => {
    await header.searchButton(page).click();
    await searchScreen.keywordInput(page).fill('no-such-user-xyz-nonexistent');
    await searchScreen.submitButton(page).click();

    await expect(page.getByText('該当する利用者が見つかりませんでした。')).toBeVisible();
  });
});
