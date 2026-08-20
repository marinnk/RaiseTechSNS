#!/usr/bin/env bash
# E2Eテスト（scenarios/performance）を実行し、レポートをe2e/results/に残す。
#
# 実行例:
#   ./e2e/run.sh scenarios
#   ./e2e/run.sh performance
#   ./e2e/run.sh scenarios auth-login.spec.ts   # 特定specのみ
#
# 事前準備: backend（8080）・frontend（5173）・DB（5432、プロフィール編集シナリオがあるなら
# MinIOも）が起動していること（.claude/skills/run-app/SKILL.md参照）。
set -euo pipefail

TRACK="${1:?トラックを指定してください（scenarios / performance）}"
SPEC_FILTER="${2:-}"

if [ "$TRACK" != "scenarios" ] && [ "$TRACK" != "performance" ]; then
  echo "トラックはscenarios/performanceのいずれかを指定してください: $TRACK" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- ヘルスチェック（run-appスキルと同じcurlパターン） ---
echo "Checking backend (8080)..."
if ! curl -sS -f http://localhost:8080/api/health > /dev/null; then
  echo "backend（8080）が応答しません。.claude/skills/run-app/SKILL.mdの手順で起動してください。" >&2
  exit 1
fi
echo "Checking frontend (5173)..."
if ! curl -sS -f -o /dev/null "${E2E_BASE_URL:-http://localhost:5173}/"; then
  echo "frontend（5173）が応答しません。.claude/skills/run-app/SKILL.mdの手順で起動してください。" >&2
  exit 1
fi

# --- 実行 ---
if [ -n "$SPEC_FILTER" ]; then
  npx playwright test --project="$TRACK" "$TRACK/$SPEC_FILTER"
else
  npx playwright test --project="$TRACK"
fi

# --- レポートの保存＋ローテーション（直近5件。perf-tests/k6/run.shと同じ方式） ---
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="results/$TRACK"
mkdir -p "$OUT_DIR"
if [ -d "playwright-report" ]; then
  cp -R playwright-report "$OUT_DIR/$TRACK-$TIMESTAMP"
  echo "Report copied to e2e/$OUT_DIR/$TRACK-$TIMESTAMP/index.html"
fi

KEEP=5
REPORT_COUNT=$(ls -1d "$OUT_DIR/$TRACK-"*/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$REPORT_COUNT" -gt "$KEEP" ]; then
  ls -1d "$OUT_DIR/$TRACK-"*/ | sort | head -n "$((REPORT_COUNT - KEEP))" | while IFS= read -r old; do
    rm -rf "$old"
  done
fi

echo ""
echo "e2e_ プレフィックスの登録ユーザーがDBに残っています。不要になったら手動でクリーンアップしてください:"
echo "  docker exec -i raisetechsns-db psql -v ON_ERROR_STOP=1 -U raisetechsns -d raisetechsns < e2e/seed/cleanup.sql"
