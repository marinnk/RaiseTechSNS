// 追加シナリオ：画面横断のハッピーパス
//
// docs/screen-design.md の画面遷移図をひととおりなぞる統合的なシナリオ。
// A（authedPage）が投稿する → B（secondUserPage）がフォロー・いいね・コメントする →
// 双方の画面（タイムライン「フォロー中」タブ・プロフィールのフォロー数）に反映される、
// という一連の流れをtest.step()で区切って検証する。
//
// 【並列実行時の注意】「全体」タブ（scope=all）は他specが並行して作成する投稿とも混ざるため、
// 特定の投稿が必ず一覧に表示されることを前提にした検証には使わない。Aの投稿をBが見つける場面は
// 検索経由でAのプロフィールへ行き、そこの投稿一覧（userId絞り込み）から辿る。同様にAが自分の
// 投稿を確認する場面も、自分のプロフィールの投稿一覧（userId絞り込み）を使う。

import { test, expect } from '../support/fixtures';
import { header, postDetailScreen, postItem, postItemActions, profileScreen, searchScreen } from '../support/selectors';

test('新規投稿→別ユーザーのフォロー・いいね・コメント→双方の画面に反映される', async ({
  authedPage: userA,
  secondUserPage: userB,
  user: a,
}) => {
  const postContent = `e2e cross-screen post ${Date.now()}`;
  const commentContent = `e2e cross-screen comment ${Date.now()}`;

  await test.step('AがpostContentで投稿する', async () => {
    await header.createPostButton(userA).click();
    const createModal = userA.getByRole('dialog', { name: '投稿を作成' });
    await createModal.getByLabel('投稿内容').fill(postContent);
    await createModal.getByRole('button', { name: '投稿' }).click();
    await expect(createModal).toBeHidden();
  });

  await test.step('Bが検索でAを見つけ、プロフィールでフォロー・いいね・コメントする', async () => {
    await header.searchButton(userB).click();
    await searchScreen.keywordInput(userB).fill(a.username);
    await searchScreen.submitButton(userB).click();
    await searchScreen.resultItem(userB, a.username).click();

    await profileScreen.followToggleButton(userB).click();
    await expect(profileScreen.followToggleButton(userB)).toHaveText('フォロー中');

    // フォロー後もAのプロフィール画面のまま。その投稿一覧からいいね・コメントする
    const item = postItem(userB, postContent);
    await postItemActions.likeButton(item).click();
    await expect(postItemActions.likeButton(item)).toHaveAttribute('aria-pressed', 'true');

    await postItemActions.commentLink(item).click();
    await postDetailScreen.commentInput(userB).fill(commentContent);
    await postDetailScreen.commentSubmitButton(userB).click();
    await expect(userB.locator('.comment-item', { hasText: commentContent })).toBeVisible();
  });

  await test.step('Bの「フォロー中」タブにAの投稿が表示される', async () => {
    // 投稿詳細→（Aのプロフィール経由で開いたため）プロフィールに戻る→タイムラインに戻る
    await postDetailScreen.backLink(userB).click();
    await profileScreen.backLink(userB).click();
    await header.tab(userB, 'フォロー中').click();
    await expect(postItem(userB, postContent)).toBeVisible();
  });

  await test.step('Aの自分の投稿にいいね・コメントの反映、フォロワー数にBが反映される', async () => {
    await userA.reload();
    await header.ownProfileButton(userA).click();

    const item = postItem(userA, postContent);
    await expect(item).toContainText('いいね 1');
    await expect(item).toContainText('コメント 1');
    await expect(userA.getByText(`@${a.username}`)).toBeVisible();
    await expect(profileScreen.followerCountButton(userA)).toContainText('1 フォロワー');
  });

  await test.step('Bの自分のプロフィールのフォロー中人数が1件になっている', async () => {
    await header.ownProfileButton(userB).click();
    await expect(profileScreen.followingCountButton(userB)).toContainText('1 フォロー中');
  });
});
