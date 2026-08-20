// ブラウザパフォーマンステスト：無限スクロールの追加読込にかかる時間
//
// フォロワー一覧（無ページネーション）と異なり、タイムラインはカーソルページネーション
// （beforeId）で追加読込する設計（perf-tests/README.md参照）。スクロールでの体感遅延を計測する。
//
// 「全体」タブ（scope=all）は他specが並行して作成する投稿とも混ざり、件数の前提が崩れるため、
// フォロー関係の無い新規ユーザーなら自分の投稿のみが表示される「フォロー中」タブを使う
// （timeline-pagination.spec.tsと同じ理由）。

import { test, expect } from '../support/fixtures';
import { createManyPosts } from '../support/api';
import { header } from '../support/selectors';
import { recordTiming } from '../support/perfTiming';

const THRESHOLD_MS = 1000;
const TOTAL_POSTS = 25;
const PAGE_SIZE = 20;

test('スクロールでの追加読込にかかる時間', async ({ authedPage: page }, testInfo) => {
  await createManyPosts(page.request, TOTAL_POSTS, 'e2e perf infinite-scroll post');
  await page.reload();
  await header.tab(page, 'フォロー中').click();
  await expect(page.locator('.post-item')).toHaveCount(PAGE_SIZE);

  const start = performance.now();
  const responsePromise = page.waitForResponse(
    (res) => res.request().method() === 'GET' && res.url().includes('/api/posts') && res.status() === 200,
  );
  await page.locator('.post-list-sentinel').scrollIntoViewIfNeeded();
  await responsePromise;
  await expect(page.locator('.post-item')).toHaveCount(TOTAL_POSTS);
  const elapsed = performance.now() - start;

  await recordTiming(testInfo, 'infinite-scroll-load-more', elapsed, THRESHOLD_MS);
  expect(elapsed, `追加読込に${elapsed.toFixed(0)}ms（目安${THRESHOLD_MS}ms）`).toBeLessThan(THRESHOLD_MS);
});
