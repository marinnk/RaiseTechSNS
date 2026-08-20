// UC03 投稿する（docs/functional-requirements.md）

import { test, expect } from '../support/fixtures';
import { header, modal, postForm, postItem } from '../support/selectors';
import { VALID_JPG } from '../support/fixtureFiles';

test.describe('投稿する', () => {
  test('テキストのみで投稿すると、一覧の先頭に反映される', async ({ authedPage: page }) => {
    const content = `e2e post-create ${Date.now()}`;

    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill(content);
    await postForm.submitButton(createModal, '投稿').click();

    // 投稿成功でモーダルが閉じ、一覧の先頭（最新）に反映される
    await expect(createModal).toBeHidden();
    const posts = page.locator('.post-item');
    await expect(posts.first()).toContainText(content);
  });

  test('空文字では投稿ボタンが無効化され、投稿できない', async ({ authedPage: page }) => {
    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill('   ');

    await expect(postForm.submitButton(createModal, '投稿')).toBeDisabled();
  });

  test('280文字を超える入力は、テキストエリア自体が280文字までに制限される', async ({ authedPage: page }) => {
    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    const textarea = postForm.contentInput(createModal);

    await textarea.pressSequentially('あ'.repeat(285), { delay: 0 });

    await expect(textarea).toHaveValue('あ'.repeat(280));
    await expect(createModal.getByText('280/280')).toBeVisible();
    await expect(postForm.submitButton(createModal, '投稿')).toBeEnabled();
  });

  test('画像は5枚以上選択すると拒否され、追加されない', async ({ authedPage: page }) => {
    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill('e2e post with too many images');

    await postForm.imageFileInput(createModal).setInputFiles([VALID_JPG, VALID_JPG, VALID_JPG, VALID_JPG, VALID_JPG]);

    await expect(createModal.getByRole('alert')).toHaveText('画像は最大4枚までです。');
    await expect(createModal.locator('.image-preview-item')).toHaveCount(0);
  });

  test('画像付きで投稿すると、一覧に画像も反映される', async ({ authedPage: page }) => {
    const content = `e2e post-create with image ${Date.now()}`;

    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill(content);
    await postForm.imageFileInput(createModal).setInputFiles([VALID_JPG]);
    await expect(createModal.locator('.image-preview-item')).toHaveCount(1);

    await postForm.submitButton(createModal, '投稿').click();
    await expect(createModal).toBeHidden();

    const item = postItem(page, content);
    await expect(item.locator('img')).toHaveCount(1);
  });
});
