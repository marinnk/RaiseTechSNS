// performanceトラックのspecから使う、時間計測結果の記録ヘルパー。
//
// Playwrightのworkerはspecファイルごとに別プロセスになり得るため、単純なインメモリ配列を
// 複数specファイルで共有する方式は取らない。代わりにtestInfo.attach()でテストごとに
// JSONを添付し、カスタムレポーター（perfReporter.ts）がonTestEndで収集・onEndで
// 集計JSONへ書き出す（`workers: 1`をperformanceプロジェクトに設定しているのは、CPU競合による
// 計測ブレを避けるためであり、この収集方式が単一プロセス前提というわけではない）。

import type { TestInfo } from '@playwright/test';

export const PERF_ATTACHMENT_NAME = 'perf-timing';

export interface TimingEntry {
  journey: string;
  ms: number;
  threshold: number;
  timestamp: string;
}

/**
 * 計測結果を記録し、しきい値（目安であってSLAではない。docs/basic-design.md §6参照）に対する
 * ソフトな検証も行う。しきい値超過はテスト失敗として扱うが、初期値はすべて実測前の暫定値のため、
 * 実装後に一度実行して得られた実測値をもとに調整すること（e2e/README.md参照）。
 */
export async function recordTiming(testInfo: TestInfo, journey: string, ms: number, threshold: number) {
  const entry: TimingEntry = { journey, ms, threshold, timestamp: new Date().toISOString() };
  await testInfo.attach(PERF_ATTACHMENT_NAME, {
    body: JSON.stringify(entry),
    contentType: 'application/json',
  });
}
