// ブラウザパフォーマンステスト：タイムライン初回表示（新規ナビゲーション）の読み込み時間
//
// perf-tests/frontend（Lighthouse）もタイムライン画面を対象にするが、単発の監査スコアであり
// 実行のたびの実測msは出さない。こちらはNavigation Timing APIで実測msを記録する。
//
// npm run dev（未バンドルのVite開発サーバー）に対する計測は、本番ビルドより悪化して見える
// （e2e/README.md参照）。本番相当の数値が必要な場合はE2E_BASE_URL=http://localhost:4173で
// 実行すること（frontendをnpm run build && npm run previewで起動した状態）。

import { test, expect } from '../support/fixtures';
import { loginViaApi } from '../support/api';
import { recordTiming } from '../support/perfTiming';

const THRESHOLD_MS = 1500;

test('タイムライン初回表示のNavigation Timing（domContentLoaded）', async ({ page, user }, testInfo) => {
  // ログイン画面を経由せず、Cookieだけ用意した状態で新規ナビゲーションを計測する
  // （ログイン操作そのものの時間はlogin-timing.spec.tsで別途計測済み）
  await loginViaApi(page.request, user);

  await page.goto('/');
  await expect(page.getByRole('button', { name: '投稿を作成する' })).toBeVisible();

  const timing = await page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadEvent: nav.loadEventEnd - nav.startTime,
      responseEnd: nav.responseEnd - nav.startTime,
    };
  });

  console.log(
    `domContentLoaded=${timing.domContentLoaded.toFixed(0)}ms ` +
      `load=${timing.loadEvent.toFixed(0)}ms responseEnd=${timing.responseEnd.toFixed(0)}ms`,
  );
  await recordTiming(testInfo, 'timeline-first-load-domContentLoaded', timing.domContentLoaded, THRESHOLD_MS);

  expect(
    timing.domContentLoaded,
    `domContentLoadedが${timing.domContentLoaded.toFixed(0)}ms（目安${THRESHOLD_MS}ms）`,
  ).toBeLessThan(THRESHOLD_MS);
});
