// ブラウザパフォーマンステスト：投稿送信から一覧反映までの体感時間
//
// perf-tests/k6/scenarios/post-create.ts はAPI単体の応答時間を見るが、こちらはクリックから
// 実際にReactが再描画して新しい投稿が見えるようになるまでの、ユーザーが体感する時間を計測する。

import { test, expect } from '../support/fixtures';
import { header, modal, postForm } from '../support/selectors';
import { recordTiming } from '../support/perfTiming';

const THRESHOLD_MS = 1500;

test('投稿送信から一覧反映までの時間', async ({ authedPage: page }, testInfo) => {
  const content = `e2e perf post-submission ${Date.now()}`;

  await header.createPostButton(page).click();
  const createModal = modal(page, '投稿を作成');
  await postForm.contentInput(createModal).fill(content);

  const start = performance.now();
  await postForm.submitButton(createModal, '投稿').click();
  await expect(page.locator('.post-item').first()).toContainText(content);
  const elapsed = performance.now() - start;

  await recordTiming(testInfo, 'post-submission-round-trip', elapsed, THRESHOLD_MS);
  expect(elapsed, `投稿→一覧反映に${elapsed.toFixed(0)}ms（目安${THRESHOLD_MS}ms）`).toBeLessThan(THRESHOLD_MS);
});
