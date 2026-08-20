// UC08 自分のプロフィールを編集する（docs/functional-requirements.md）
//
// 【前提】アバターアップロードはMinIO（docker-compose.ymlのminioサービス）が必要。
// run-appスキルの手順でdocker compose up -d（minio・minio-init含む）していることを確認すること。

import { test, expect } from '../support/fixtures';
import { header, profileEditScreen, profileScreen } from '../support/selectors';
import { VALID_JPG } from '../support/fixtureFiles';

test.describe('プロフィール編集', () => {
  test('自己紹介の文字数カウンターが更新され、保存で反映・キャンセルで破棄される', async ({
    authedPage: page,
  }) => {
    await header.ownProfileButton(page).click();
    await profileScreen.editProfileButton(page).click();

    const savedBio = `e2e saved bio ${Date.now()}`;
    await profileEditScreen.bioInput(page).fill(savedBio);
    await expect(page.getByText(`${savedBio.length}/160`)).toBeVisible();
    await profileEditScreen.saveButton(page).click();

    await expect(page.getByText(savedBio)).toBeVisible();

    // 再度編集を開き、変更してキャンセル → 直前に保存した内容のまま
    await profileScreen.editProfileButton(page).click();
    await profileEditScreen.bioInput(page).fill('discarded bio, should not be saved');
    await profileEditScreen.cancelButton(page).click();

    await expect(page.getByText(savedBio)).toBeVisible();
  });

  test('アイコン画像は選択すると即座に反映され、キャンセルしても元に戻らない', async ({ authedPage: page }) => {
    await header.ownProfileButton(page).click();
    // 初期状態はアイコン未設定（プレースホルダー表示）
    await expect(page.locator('.profile-avatar-placeholder')).toBeVisible();

    await profileScreen.editProfileButton(page).click();
    await profileEditScreen.avatarFileInput(page).setInputFiles(VALID_JPG);
    await expect(page.getByAltText('アイコンのプレビュー')).toBeVisible();

    // 自己紹介は変更せずキャンセルしても、既にアップロード済みのアイコンは元に戻らない
    // （画面設計書に明記された仕様。保存操作とアイコンのアップロードはライフサイクルが別）
    await profileEditScreen.cancelButton(page).click();
    await expect(page.locator('.profile-avatar-placeholder')).toHaveCount(0);
    await expect(page.locator('.profile-avatar').first()).toBeVisible();
  });

  test('アイコン画像は削除できる', async ({ authedPage: page }) => {
    await header.ownProfileButton(page).click();
    await profileScreen.editProfileButton(page).click();
    await profileEditScreen.avatarFileInput(page).setInputFiles(VALID_JPG);
    await expect(page.getByAltText('アイコンのプレビュー')).toBeVisible();

    await profileEditScreen.removeAvatarLink(page).click();
    await expect(page.getByAltText('アイコンのプレビュー')).toHaveCount(0);
    await expect(page.locator('.profile-avatar-placeholder')).toBeVisible();
  });
});
