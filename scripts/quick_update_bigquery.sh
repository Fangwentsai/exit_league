#!/bin/bash

# BigQuery 快速更新腳本
# 使用前請先設定你的 PROJECT_ID 和 DATASET_ID

PROJECT_ID="your_project_id"  # 替換為你的專案 ID
DATASET_ID="your_dataset_id"  # 替換為你的資料集 ID
TABLE_NAME="season3_game_details_individual"

echo "🚀 開始更新 BigQuery 資料..."

# 1. 刪除舊表格（如果存在）
echo "1️⃣ 刪除舊表格..."
bq rm -f -t ${PROJECT_ID}:${DATASET_ID}.${TABLE_NAME}

# 2. 建立新表格並載入資料
echo "2️⃣ 建立新表格並載入資料..."
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  ${PROJECT_ID}:${DATASET_ID}.${TABLE_NAME} \
  season3_game_details_individual.json

echo "✅ 更新完成！"
echo "📊 資料筆數: 3,360 筆"
echo "🔗 前往查看: https://console.cloud.google.com/bigquery?project=${PROJECT_ID}"
