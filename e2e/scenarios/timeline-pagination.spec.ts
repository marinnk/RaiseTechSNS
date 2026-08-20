// 追加シナリオ：無限スクロール（docs/screen-design.md タイムライン画面）
//
// UC一覧には明示されていないが、画面設計書に明記された挙動（一覧末尾で自動的に追加読み込みする）
// のため、独立したシナリオとして検証する。usePosts.ts のPAGE_SIZE（20件）を踏まえ、
// 20件を超える投稿をAPIで用意し、スクロールで2ページ目が読み込まれることを確認する。
//
// 「全体」タブ（scope=all）は他のテスト・並列実行中の他specが作成した投稿も同じ一覧に混ざるため、
// 件数の厳密な検証には使えない。「フォロー中」タブ（scope=following）は自分自身の投稿のみを
// 表示する設計（画面遷移・screen-design.md参照）のため、フォロー関係を作らない新規ユーザーなら
// 他テストのデータから隔離された状態で検証できる。

import { test, expect } from '../support/fixtures';
import { createManyPosts } from '../support/api';
import { header } from '../support/selectors';

const TOTAL_POSTS = 25;
const PAGE_SIZE = 20;
const PREFIX = 'e2e infinite-scroll post';

test('20件を超える投稿がある場合、スクロールで追加読み込みされる', async ({ authedPage: page }) => {
  await createManyPosts(page.request, TOTAL_POSTS, PREFIX);
  await page.reload();
  await expect(page.getByRole('button', { name: '投稿を作成する' })).toBeVisible();
  await header.tab(page, 'フォロー中').click();

  const posts = page.locator('.post-item');
  await expect(posts).toHaveCount(PAGE_SIZE);

  await page.locator('.post-list-sentinel').scrollIntoViewIfNeeded();
  await expect(posts).toHaveCount(TOTAL_POSTS);

  // 重複表示が無いことを確認する（#1〜#25がそれぞれちょうど1回ずつ表示されている）。
  // 末尾に別の数字が続かないことを否定先読みで保証する（"#1"が"#10"〜"#19"に部分一致しないように）
  for (let i = 1; i <= TOTAL_POSTS; i++) {
    await expect(page.locator('.post-item', { hasText: new RegExp(`${PREFIX} #${i}(?!\\d)`) })).toHaveCount(1);
  }
});
