// perf-tests/frontend/run.sh から参照するLighthouse監査対象の設定。
//
// 【重要】このフロントエンドはreact-router等のURLルーティングを持たない単一ページの
// SPA（frontend/src/App.tsx参照）で、タイムライン・投稿詳細・プロフィールいずれの画面も
// 内部state（useState）による切り替えのみで、URLは常に"/"のまま変化しない。
// そのため通常のLighthouse CLI（URLへのフレッシュなナビゲーションを前提とする）で
// 個別に監査できるのは、ログイン後に最初に表示されるタイムライン画面（"/"）のみ。
// 投稿詳細・プロフィール画面を監査したい場合は、Lighthouseのuser-flow API
// （Puppeteerでクリック操作を行いsnapshot/timespanモードで計測する方式）への
// 拡張が別途必要になる（本チョアの対象外。将来の拡張ポイントとして記録しておく）。
module.exports = {
  targetPath: '/', // 監査対象はタイムライン画面（ログイン後の初期表示）のみ
  reportName: 'timeline',
};
