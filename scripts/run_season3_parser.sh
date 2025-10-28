#!/bin/bash

# Season 3 資料解析執行腳本

echo "=== Season 3 資料解析器 ==="

# 檢查 Python 環境
if ! command -v python3 &> /dev/null; then
    echo "錯誤: 找不到 python3"
    exit 1
fi

# 安裝必要套件
echo "安裝必要套件..."
pip3 install -r requirements_parser.txt

# 檢查目錄是否存在
if [ ! -d "../game_result/season3" ]; then
    echo "錯誤: 找不到 game_result/season3 目錄"
    echo "請確認目錄路徑正確"
    exit 1
fi

# 執行解析
echo "開始解析 Season 3 資料..."
python3 parse_season3_data.py

# 檢查輸出檔案
if [ -f "season3_match_results.json" ] && [ -f "season3_game_details.json" ]; then
    echo ""
    echo "✅ 解析完成！生成的檔案："
    echo "📊 season3_match_results.json - 比賽結果摘要"
    echo "📋 season3_game_details.json - 詳細對戰記錄"
    echo "📈 season3_statistics.json - 統計報告"
    echo ""
    echo "檔案大小："
    ls -lh season3_*.json
else
    echo "❌ 解析失敗，請檢查錯誤訊息"
    exit 1
fi

