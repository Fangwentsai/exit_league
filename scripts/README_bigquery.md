# BigQuery 資料匯入指南

本指南說明如何將第五屆飛鏢聯賽的 Google Sheets 資料匯入 BigQuery 進行分析。

## 前置需求

1. **Google Cloud 專案**: 需要有一個 Google Cloud 專案
2. **認證設定**: 設定 Google Cloud 認證
3. **API 啟用**: 啟用 BigQuery 和 Google Sheets API

## 快速開始

### 1. 安裝依賴套件

```bash
cd scripts
pip install -r requirements_bigquery.txt
```

### 2. 設定認證

選擇以下其中一種方式：

#### 方式 A: 使用 gcloud 認證
```bash
gcloud auth application-default login
```

#### 方式 B: 使用服務帳戶金鑰
1. 在 Google Cloud Console 建立服務帳戶
2. 下載金鑰檔案 (JSON 格式)
3. 設定環境變數：
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### 3. 啟用必要的 API

```bash
gcloud services enable bigquery.googleapis.com
gcloud services enable sheets.googleapis.com
```

### 4. 執行匯入腳本

```bash
python sheets_to_bigquery.py
```

## 資料結構

### 賽程表格 (schedule)
- `game_id`: 遊戲編號
- `game_date`: 比賽日期
- `away_team`: 客場隊伍
- `away_score`: 客場分數
- `home_team`: 主場隊伍
- `home_score`: 主場分數
- `venue`: 比賽場地
- `winner`: 獲勝隊伍
- `loser`: 敗北隊伍
- `drinking_team`: 飲酒隊伍
- `draw_team`: 和局隊伍

### 排名表格 (team_rankings)
- `rank`: 排名
- `team_name`: 隊伍名稱
- `wins`: 勝場數
- `losses`: 敗場數
- `draws`: 和局數
- `points`: 積分
- `drinking_bonus`: 飲酒加成
- `total_score`: 總分
- `season`: 賽季

## 分析查詢範例

參考 `bigquery_analysis.sql` 檔案中的查詢範例，包括：

1. **隊伍戰績統計**: 計算各隊勝敗率和總戰績
2. **每日比賽統計**: 按日期統計比賽場次
3. **場地統計**: 各場地的比賽場次
4. **高分比賽**: 找出總分最高的比賽
5. **主客場戰績**: 分析隊伍主客場表現差異
6. **月度趨勢**: 按月份分析比賽趨勢

## 使用範例

### 查看所有比賽
```sql
SELECT * FROM `your-project-id.darts_league.schedule`
ORDER BY game_date;
```

### 隊伍戰績排名
```sql
SELECT 
    team_name,
    COUNT(*) as total_games,
    SUM(CASE WHEN winner = team_name THEN 1 ELSE 0 END) as wins,
    ROUND(
        SUM(CASE WHEN winner = team_name THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        2
    ) as win_percentage
FROM (
    SELECT away_team as team_name, winner FROM `your-project-id.darts_league.schedule`
    UNION ALL
    SELECT home_team as team_name, winner FROM `your-project-id.darts_league.schedule`
) team_games
GROUP BY team_name
ORDER BY wins DESC;
```

## 故障排除

### 常見問題

1. **認證錯誤**: 確保已正確設定 Google Cloud 認證
2. **權限錯誤**: 確保服務帳戶有 BigQuery 和 Sheets 的讀取權限
3. **API 未啟用**: 確保已啟用必要的 Google Cloud API
4. **專案 ID 錯誤**: 確認 GOOGLE_CLOUD_PROJECT 環境變數設定正確

### 除錯模式

在腳本中設定日誌級別為 DEBUG：
```python
logging.basicConfig(level=logging.DEBUG)
```

## 進階功能

### 定期更新
可以設定 cron job 定期執行匯入腳本：
```bash
# 每天凌晨 2 點執行
0 2 * * * cd /path/to/scripts && python sheets_to_bigquery.py
```

### 增量更新
修改腳本支援增量更新，只匯入新的資料：
```python
# 在 upload_to_bigquery 方法中使用 WRITE_APPEND 模式
self.upload_to_bigquery(df, 'schedule', write_mode='WRITE_APPEND')
```

## 聯絡資訊

如有問題，請檢查：
1. Google Cloud Console 中的 BigQuery 資料集
2. 腳本執行的日誌輸出
3. BigQuery 中的表格結構是否正確
