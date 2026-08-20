// UC06 利用者をフォローする（docs/functional-requirements.md）
//
// フォロー対象の利用者は、並列実行中の他specが作る投稿とも混ざり得る「全体」タブを走査するのではなく、
// 検索でそのプロフィールへ行く（他テストのデータから隔離され、確実にそのプロフィールへ辿り着ける）。

import { test, expect } from '../support/fixtures';
import { createPost } from '../support/api';
import { header, postItem, postItemActions, profileScreen, searchScreen } from '../support/selectors';

async function openOtherUsersProfile(page: import('@playwright/test').Page, username: string) {
  await header.searchButton(page).click();
  await searchScreen.keywordInput(page).fill(username);
  await searchScreen.submitButton(page).click();
  await searchScreen.resultItem(page, username).click();
}

test.describe('フォロー・フォロー解除', () => {
  test('フォロー状態がトグルでき、「フォロー中」タブの表示・フォロワー数に反映される', async ({
    authedPage: page,
    secondUser,
    secondUserPage,
  }) => {
    const content = `e2e followee post ${Date.now()}`;
    await createPost(secondUserPage.request, content);

    await openOtherUsersProfile(page, secondUser.username);

    const followButton = profileScreen.followToggleButton(page);
    await expect(followButton).toHaveText('フォローする');
    await expect(followButton).toHaveAttribute('aria-pressed', 'false');
    await expect(profileScreen.followerCountButton(page)).toContainText('0 フォロワー');

    await followButton.click();
    await expect(followButton).toHaveText('フォロー中');
    await expect(followButton).toHaveAttribute('aria-pressed', 'true');
    await expect(profileScreen.followerCountButton(page)).toContainText('1 フォロワー');

    // タイムラインの「フォロー中」タブにフォロー対象の投稿が表示される
    await profileScreen.backLink(page).click();
    await header.tab(page, 'フォロー中').click();
    await expect(postItem(page, content)).toBeVisible();

    // フォロー解除すると、「フォロー中」タブから消える
    await postItemActions.authorButton(postItem(page, content)).click();
    const followButtonAgain = profileScreen.followToggleButton(page);
    await expect(followButtonAgain).toHaveText('フォロー中');
    await followButtonAgain.click();
    await expect(followButtonAgain).toHaveText('フォローする');
    await expect(profileScreen.followerCountButton(page)).toContainText('0 フォロワー');

    await profileScreen.backLink(page).click();
    // scopeの値自体は変わらないため、タブを往復して再取得させる（follow.spec.ts固有の注意点）
    await header.tab(page, '全体').click();
    await header.tab(page, 'フォロー中').click();
    await expect(postItem(page, content)).toHaveCount(0);
  });

  test('自分のプロフィールのフォロー中人数にも反映される', async ({ authedPage: page, secondUser, secondUserPage }) => {
    const content = `e2e followee post for count ${Date.now()}`;
    await createPost(secondUserPage.request, content);

    await openOtherUsersProfile(page, secondUser.username);
    await profileScreen.followToggleButton(page).click();
    await expect(profileScreen.followToggleButton(page)).toHaveText('フォロー中');

    await profileScreen.backLink(page).click();
    await header.ownProfileButton(page).click();
    await expect(profileScreen.followingCountButton(page)).toContainText('1 フォロー中');
  });
});
