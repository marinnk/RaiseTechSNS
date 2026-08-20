// 追加シナリオ：投稿画像のクライアント側バリデーション（UC03の補足）
//
// utils/imageFile.ts（フロントエンド）の制約（jpg/png形式・5MB以下）を、投稿作成モーダルの
// 画像選択UIで検証する。5枚以上を拒否するケースはpost-create.spec.tsでカバー済みのため、
// ここではファイル形式・サイズの検証に絞る。

import { test, expect } from '../support/fixtures';
import { header, modal, postForm } from '../support/selectors';
import { INVALID_TXT, VALID_JPG, VALID_PNG, oversizedImageFile } from '../support/fixtureFiles';

test.describe('投稿画像のバリデーション', () => {
  test('画像以外のファイルは拒否される', async ({ authedPage: page }) => {
    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');

    await postForm.imageFileInput(createModal).setInputFiles(INVALID_TXT);

    await expect(createModal.getByRole('alert')).toHaveText('画像はjpgまたはpng形式のみ選択できます。');
    await expect(createModal.locator('.image-preview-item')).toHaveCount(0);
  });

  test('5MBを超える画像は拒否される', async ({ authedPage: page }) => {
    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');

    await postForm.imageFileInput(createModal).setInputFiles(oversizedImageFile());

    await expect(createModal.getByRole('alert')).toHaveText('画像は5MB以下にしてください。');
    await expect(createModal.locator('.image-preview-item')).toHaveCount(0);
  });

  test('jpg・pngはいずれも受理される', async ({ authedPage: page }) => {
    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');

    await postForm.imageFileInput(createModal).setInputFiles([VALID_JPG, VALID_PNG]);

    await expect(createModal.getByRole('alert')).toHaveCount(0);
    await expect(createModal.locator('.image-preview-item')).toHaveCount(2);
  });
});
