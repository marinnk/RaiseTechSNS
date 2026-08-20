// UC07 投稿を編集する（docs/functional-requirements.md）

import { test, expect } from '../support/fixtures';
import { createPost } from '../support/api';
import { header, modal, postForm, postItem, postItemActions, searchScreen } from '../support/selectors';

test.describe('投稿の編集・削除', () => {
  test('自分の投稿には編集・削除リンクが表示され、他人の投稿には表示されない', async ({
    authedPage: page,
    secondUser,
    secondUserPage,
  }) => {
    const ownContent = `e2e own post ${Date.now()}`;
    const otherContent = `e2e other's post ${Date.now()}`;
    await createPost(secondUserPage.request, otherContent);

    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill(ownContent);
    await postForm.submitButton(createModal, '投稿').click();
    await expect(createModal).toBeHidden();

    const ownItem = postItem(page, ownContent);
    await expect(postItemActions.editLink(ownItem)).toBeVisible();
    await expect(postItemActions.deleteLink(ownItem)).toBeVisible();

    // 他人の投稿は、並列実行中の他specが作る投稿で埋まり得る「全体」タブを走査するのではなく、
    // 検索でその利用者のプロフィールへ行き、そこの投稿一覧（userId絞り込み）で確認する
    // （他テストのデータから隔離され、確実にその利用者自身の投稿だけが表示される）
    await header.searchButton(page).click();
    await searchScreen.keywordInput(page).fill(secondUser.username);
    await searchScreen.submitButton(page).click();
    await searchScreen.resultItem(page, secondUser.username).click();

    const otherItem = postItem(page, otherContent);
    await expect(otherItem).toBeVisible();
    await expect(postItemActions.editLink(otherItem)).toHaveCount(0);
    await expect(postItemActions.deleteLink(otherItem)).toHaveCount(0);
  });

  test('編集すると内容が反映され、キャンセルすると変更が破棄される', async ({ authedPage: page }) => {
    const originalContent = `e2e editable post ${Date.now()}`;
    const editedContent = `e2e edited post ${Date.now()}`;

    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill(originalContent);
    await postForm.submitButton(createModal, '投稿').click();
    await expect(createModal).toBeHidden();

    // まずキャンセル：編集内容は破棄され、元の本文のまま
    const item = postItem(page, originalContent);
    await postItemActions.editLink(item).click();
    const editModal = modal(page, '投稿を編集');
    await postForm.contentInput(editModal).fill(editedContent);
    await postForm.cancelButton(editModal).click();
    await expect(editModal).toBeHidden();
    await expect(postItem(page, originalContent)).toBeVisible();
    await expect(postItem(page, editedContent)).toHaveCount(0);

    // 次に保存：編集内容が反映される
    await postItemActions.editLink(item).click();
    const editModal2 = modal(page, '投稿を編集');
    await postForm.contentInput(editModal2).fill(editedContent);
    await postForm.submitButton(editModal2, '保存').click();
    await expect(editModal2).toBeHidden();
    await expect(postItem(page, editedContent)).toBeVisible();
    await expect(postItem(page, originalContent)).toHaveCount(0);
  });

  test('削除すると確認モーダルを経て一覧から消える', async ({ authedPage: page }) => {
    const content = `e2e deletable post ${Date.now()}`;

    await header.createPostButton(page).click();
    const createModal = modal(page, '投稿を作成');
    await postForm.contentInput(createModal).fill(content);
    await postForm.submitButton(createModal, '投稿').click();
    await expect(createModal).toBeHidden();

    const item = postItem(page, content);
    await postItemActions.deleteLink(item).click();
    const deleteModal = modal(page, '投稿を削除');
    await expect(deleteModal.getByText('この投稿を削除しますか？')).toBeVisible();
    await deleteModal.getByRole('button', { name: '削除' }).click();

    await expect(deleteModal).toBeHidden();
    await expect(postItem(page, content)).toHaveCount(0);
  });
});
