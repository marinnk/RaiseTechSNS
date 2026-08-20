// ブラウザパフォーマンステスト：検索送信から結果表示までの体感時間
//
// perf-tests側にはユーザー検索の負荷試験シナリオが無い（索引なしのLIKE検索という設計上の
// 弱点はperf-tests/README.mdに記載があるのみ）。ここでは1ユーザーが検索したときの体感時間を計測する。

import { test, expect } from '../support/fixtures';
import { header, searchScreen } from '../support/selectors';
import { recordTiming } from '../support/perfTiming';

const THRESHOLD_MS = 1000;

test('検索送信から結果表示までの時間', async ({ authedPage: page, secondUser }, testInfo) => {
  await header.searchButton(page).click();
  await searchScreen.keywordInput(page).fill(secondUser.username);

  const start = performance.now();
  await searchScreen.submitButton(page).click();
  await expect(searchScreen.resultItem(page, secondUser.username)).toBeVisible();
  const elapsed = performance.now() - start;

  await recordTiming(testInfo, 'search-submit-to-results', elapsed, THRESHOLD_MS);
  expect(elapsed, `検索→結果表示に${elapsed.toFixed(0)}ms（目安${THRESHOLD_MS}ms）`).toBeLessThan(THRESHOLD_MS);
});
