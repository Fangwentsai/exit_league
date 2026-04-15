#!/bin/bash
# =====================================================
# weekly_update.sh — 每週聯賽資料自動化更新
# =====================================================
#
# 使用方式：
#   bash scripts/weekly_update.sh 61 66
#   bash scripts/weekly_update.sh 61 66 --dry-run    (只計算，不寫入)
#   bash scripts/weekly_update.sh 61 66 --no-push    (不自動 push)
#
# 功能：
#   1. 解析 G61~G66 的 HTML 比賽資料
#   2. 寫入 Google Sheets schedule 頁籤（分數、勝負）
#   3. 追加到 Google Sheets data 頁籤（選手數據）
#   4. 讀取 personal 頁籤更新 news.html 排行榜
#   5. 自動 git commit + push
# =====================================================

set -e

START=$1
END=$2
EXTRA_FLAGS="${@:3}"

if [ -z "$START" ] || [ -z "$END" ]; then
  echo ""
  echo "❌ 請提供場次範圍！"
  echo ""
  echo "使用方式: bash scripts/weekly_update.sh <起始場次> <結束場次>"
  echo "範例:     bash scripts/weekly_update.sh 61 66"
  echo ""
  exit 1
fi

# 切換到專案根目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo ""
echo "=================================================="
echo "  📊 難找的聯賽 — 每週自動化更新"
echo "  📁 場次範圍: G${START} ~ G${END}"
echo "  📅 執行時間: $(date '+%Y/%m/%d %H:%M')"
echo "=================================================="
echo ""

# ===== Step 0: 從 GitHub 拉取最新資料 =====
echo "⬇️  Step 0: 從 GitHub pull 最新資料..."
git pull origin main
echo ""

# 自動找 node 執行檔
NODE_BIN=$(which node 2>/dev/null || echo "")
if [ -z "$NODE_BIN" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  NODE_BIN=$(find /opt/homebrew/Cellar/node -name "node" -type f 2>/dev/null | head -1)
fi
if [ -z "$NODE_BIN" ]; then
  echo "❌ 找不到 node，請確認已安裝 Node.js"; exit 1
fi

"$NODE_BIN" scripts/weekly_update.js $START $END $EXTRA_FLAGS

echo ""
echo "=================================================="
echo "  ✅ 全部完成！"
echo "=================================================="
echo ""
