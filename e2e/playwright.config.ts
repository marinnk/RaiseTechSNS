import { defineConfig, devices } from '@playwright/test';

// このアプリはURLルーティングを持たない単一画面SPAのため（frontend/src/App.tsx・
// TimelineScreen.tsxのview state方式）、すべてのテストは`/`から始めて画面遷移を
// クリックで辿る。baseURLはE2E_BASE_URLで上書きできる（本番ビルド計測時は4173番を指定する。
// e2e/README.md参照）。
//
// backend（8080）・DB（5432）・（アバター関連シナリオがあれば）MinIOは、このconfigでは
// 起動しない。run-appスキルと同じく手動起動を前提とし、e2e/run.shが実行前にヘルスチェックする。
// 理由はe2e/README.mdの「事前準備」参照（3サービス構成のうち1つしか自動化できない上、
// run-appスキルの「固定ポート・黙って別ポートに逃げるのを禁止」という方針とも相性が悪いため）。
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    // performanceプロジェクトの計測結果集計。scenariosプロジェクトのテストは内部でフィルタし無視する
    // （support/perfReporter.ts参照。Playwrightにプロジェクト単位でレポーターを切り替える仕組みが無いため）
    ['./support/perfReporter.ts'],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'scenarios',
      testDir: './scenarios',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'performance',
      testDir: './performance',
      use: { ...devices['Desktop Chrome'] },
      // 時間計測がCPU競合でぶれないよう、performanceトラックだけは直列実行に固定する
      fullyParallel: false,
      workers: 1,
    },
  ],
});
