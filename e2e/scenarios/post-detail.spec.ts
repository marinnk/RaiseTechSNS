// UC04 他人の投稿にいいねする・UC05 他人の投稿にコメントする（docs/functional-requirements.md）
//
// 「検証対象ではない前提データ」（対象の投稿そのもの）はAPIで用意し、UIはいいね・コメント操作のみ駆動する。
//
// 対象の投稿は、並列実行中の他specが作る投稿で埋まり得る「全体」タブ（reloadして探す）ではなく、
// 検索でその利用者のプロフィールへ行き、そこの投稿一覧（userId絞り込み）から開く
// （他テストのデータから隔離され、確実にその投稿が表示される）。

import { test, expect } from '../support/fixtures';
import { createPost } from '../support/api';
import { header, postDetailScreen, postItem, postItemActions, searchScreen } from '../support/selectors';

async function openOtherUsersProfile(page: import('@playwright/test').Page, username: string) {
  await header.searchButton(page).click();
  await searchScreen.keywordInput(page).fill(username);
  await searchScreen.submitButton(page).click();
  await searchScreen.resultItem(page, username).click();
}

test.describe('投稿詳細でのいいね・コメント', () => {
  test('いいねはトグルでき、いいね→解除で元の件数に戻る', async ({ authedPage: page, secondUser, secondUserPage }) => {
    const content = `e2e likeable post ${Date.now()}`;
    await createPost(secondUserPage.request, content);

    await openOtherUsersProfile(page, secondUser.username);
    const item = postItem(page, content);
    const likeButton = postItemActions.likeButton(item);

    await expect(likeButton).toHaveAttribute('aria-pressed', 'false');
    await expect(likeButton).toContainText('いいね 0');

    await likeButton.click();
    await expect(likeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(likeButton).toContainText('いいね 1');

    // 解除すると元の件数（冪等性）
    await likeButton.click();
    await expect(likeButton).toHaveAttribute('aria-pressed', 'false');
    await expect(likeButton).toContainText('いいね 0');
  });

  test('空のコメントは投稿できず、有効なコメントは一覧・件数に反映される', async ({
    authedPage: page,
    secondUser,
    secondUserPage,
  }) => {
    const content = `e2e commentable post ${Date.now()}`;
    await createPost(secondUserPage.request, content);
    await openOtherUsersProfile(page, secondUser.username);

    const item = postItem(page, content);
    await postItemActions.commentLink(item).click();
    await expect(postDetailScreen.commentsHeading(page)).toBeVisible();

    // 空文字（空白のみ）ではコメントボタンが無効
    await postDetailScreen.commentInput(page).fill('   ');
    await expect(postDetailScreen.commentSubmitButton(page)).toBeDisabled();

    const commentContent = `e2e comment ${Date.now()}`;
    await postDetailScreen.commentInput(page).fill(commentContent);
    await postDetailScreen.commentSubmitButton(page).click();

    await expect(page.locator('.comment-item', { hasText: commentContent })).toBeVisible();
    await expect(page.locator('.post-item')).toContainText('コメント 1');

    // プロフィール画面に戻っても件数が反映されている（postStoreが唯一の情報源のため）
    await postDetailScreen.backLink(page).click();
    await expect(postItem(page, content)).toContainText('コメント 1');
  });
});
