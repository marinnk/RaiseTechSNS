#!/usr/bin/env bash
# フロントエンド画面性能監査（Lighthouse）の実行スクリプト。
#
# バックエンドAPIの負荷試験（perf-tests/k6/）とは別物であることに注意：
# こちらは同時接続数ではなく、1ユーザーがページを開いたときの読み込み・描画品質
# （Core Web Vitals・バンドルサイズ等）を計測するもの。
#
# 事前準備:
#   - backend（8080）・frontend（5173）・DB（5432）が起動していること（.claude/skills/run-app/SKILL.md参照）
#   - perf-tests/seed/seed.sqlを一度投入していること（ログインするダミーユーザーが必要なため）
#
# 実行例:
#   ./perf-tests/frontend/run.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
EMAIL="${EMAIL:-perf_user_0001@example.com}"
PASSWORD="${PASSWORD:-Passw0rd!}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../results/lighthouse"
mkdir -p "$OUT_DIR"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "Logging in as $EMAIL against $BASE_URL ..."
curl -sS -f -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null || {
  echo "ログインに失敗しました。backendが起動しているか、perf-tests/seed/seed.sqlを投入済みか確認してください。" >&2
  exit 1
}

# Netscape cookie jar形式（domain, flag, path, secure, expiry, name, value）からCookieヘッダーを組み立てる。
# HttpOnly Cookie（access_token・refresh_tokenはいずれもHttpOnly）はdomain列が"#HttpOnly_"接頭辞付きで
# 出力される仕様のため、コメント行判定の前に取り除く。
COOKIE_HEADER=$(sed 's/^#HttpOnly_//' "$COOKIE_JAR" | awk -F'\t' '!/^#/ && NF==7 {printf "%s=%s; ", $6, $7}')
if [ -z "$COOKIE_HEADER" ]; then
  echo "認証Cookieを取得できませんでした。" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_PATH="$OUT_DIR/timeline-$TIMESTAMP"

echo "Running Lighthouse against $FRONTEND_URL/ ..."
# lighthouseはfrontend/devDependenciesとしてインストールしているため、
# frontend/内で実行してnode_modules/.bin/lighthouseを解決する（OUT_DIR/REPORT_PATHは絶対パスなので影響しない）
(
  cd "$SCRIPT_DIR/../../frontend"
  npx lighthouse "$FRONTEND_URL/" \
    --output=html --output=json \
    --output-path="$REPORT_PATH" \
    --extra-headers="{\"Cookie\":\"${COOKIE_HEADER}\"}" \
    --chrome-flags="--headless=new" \
    --only-categories=performance \
    --quiet
)

echo "Report written to $REPORT_PATH.report.html"
