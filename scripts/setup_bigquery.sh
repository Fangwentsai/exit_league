#!/bin/bash

# BigQuery 設定腳本
# 用於設定 Google Cloud 環境和執行資料匯入

echo "=== BigQuery 設定腳本 ==="

# 檢查是否已安裝 gcloud
if ! command -v gcloud &> /dev/null; then
    echo "請先安裝 Google Cloud SDK:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 檢查是否已安裝 Python 套件
echo "安裝必要的 Python 套件..."
pip install -r requirements_bigquery.txt

# 設定環境變數
echo "請設定以下環境變數："
echo "export GOOGLE_CLOUD_PROJECT=your-project-id"
echo "export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json"
echo ""
echo "或者執行以下命令進行認證："
echo "gcloud auth application-default login"

# 啟用必要的 API
echo "啟用必要的 Google Cloud API..."
gcloud services enable bigquery.googleapis.com
gcloud services enable sheets.googleapis.com

echo "設定完成！"
echo ""
echo "執行匯入腳本："
echo "python sheets_to_bigquery.py"
