# BigQuery 前台上傳指南

## 📋 準備工作

確保你有以下檔案：
- ✅ `season3_match_results.json` (比賽結果資料)
- ✅ `season3_match_results_schema.json` (比賽結果 Schema)
- ✅ `season3_game_details.json` (詳細記錄資料)
- ✅ `season3_game_details_schema.json` (詳細記錄 Schema)

## 🚀 上傳步驟

### 第一個表格：比賽結果 (season3_match_results)

1. **進入 BigQuery Console**
   - 前往：https://console.cloud.google.com/bigquery
   - 選擇你的專案

2. **建立資料集 (如果還沒有)**
   - 點擊專案名稱旁的 ⋮ (三個點)
   - 選擇「建立資料集」
   - 輸入資料集 ID (例如：`exit_league_data`)

3. **建立表格**
   - 點擊資料集名稱旁的 ⋮ (三個點)
   - 選擇「建立表格」

4. **設定來源**
   - **建立表格來源**：選擇「上傳」
   - **選取檔案**：上傳 `season3_match_results.json`
   - **檔案格式**：選擇「JSON (換行符號分隔)」

5. **設定目的地**
   - **表格名稱**：輸入 `season3_match_results`

6. **設定 Schema**
   - **Schema**：選擇「以文字形式編輯」
   - 複製貼上以下 Schema：

```json
[
  {"name": "game_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "match_date", "type": "STRING", "mode": "REQUIRED"},
  {"name": "away_team", "type": "STRING", "mode": "REQUIRED"},
  {"name": "home_team", "type": "STRING", "mode": "REQUIRED"},
  {"name": "away_team_score", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "home_team_score", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "away_team_final_score", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "home_team_final_score", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "winner", "type": "STRING", "mode": "REQUIRED"},
  {"name": "loser", "type": "STRING", "mode": "REQUIRED"},
  {"name": "victory_bonus_team", "type": "STRING", "mode": "REQUIRED"},
  {"name": "victory_bonus_amount", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "drinking_bonus_team", "type": "STRING", "mode": "REQUIRED"},
  {"name": "drinking_bonus_amount", "type": "INTEGER", "mode": "REQUIRED"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "REQUIRED"}
]
```

7. **進階選項**
   - **寫入偏好設定**：選擇「覆寫表格」
   - 點擊「建立表格」

### 第二個表格：詳細記錄 (season3_game_details)

重複上述步驟，但使用以下設定：

4. **設定來源**
   - **選取檔案**：上傳 `season3_game_details.json`

5. **設定目的地**
   - **表格名稱**：輸入 `season3_game_details`

6. **設定 Schema**
   - 複製貼上以下 Schema：

```json
[
  {"name": "game_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "set_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "record_index", "type": "STRING", "mode": "REQUIRED"},
  {"name": "set_info", "type": "STRING", "mode": "REQUIRED"},
  {"name": "away_player", "type": "STRING", "mode": "REQUIRED"},
  {"name": "home_player", "type": "STRING", "mode": "REQUIRED"},
  {"name": "game_type", "type": "STRING", "mode": "REQUIRED"},
  {"name": "first_attack_player", "type": "STRING", "mode": "REQUIRED"},
  {"name": "winner", "type": "STRING", "mode": "REQUIRED"},
  {"name": "away_is_winner", "type": "BOOLEAN", "mode": "REQUIRED"},
  {"name": "home_is_winner", "type": "BOOLEAN", "mode": "REQUIRED"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "REQUIRED"}
]
```

## ✅ 驗證上傳結果

上傳完成後，你可以執行以下查詢來驗證：

### 檢查比賽結果表格
```sql
SELECT 
  COUNT(*) as total_matches,
  MIN(match_date) as first_match,
  MAX(match_date) as last_match
FROM `your_project.your_dataset.season3_match_results`
```
**預期結果**：56 筆比賽

### 檢查詳細記錄表格
```sql
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT game_id) as unique_games
FROM `your_project.your_dataset.season3_game_details`
```
**預期結果**：896 筆記錄，56 場不重複比賽

## 🔧 常見問題

### 問題 1：Schema 錯誤
- **解決方案**：確保 JSON 格式正確，沒有多餘的逗號或括號

### 問題 2：檔案格式錯誤
- **解決方案**：確保選擇「JSON (換行符號分隔)」格式

### 問題 3：資料類型不符
- **解決方案**：檢查 `created_at` 欄位是否為有效的 ISO 8601 時間格式

## 📊 範例查詢

上傳成功後，你可以試試這些查詢：

```sql
-- 查看各隊伍勝率
SELECT 
  winner,
  COUNT(*) as wins,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM `your_project.your_dataset.season3_match_results`), 2) as win_percentage
FROM `your_project.your_dataset.season3_match_results`
GROUP BY winner
ORDER BY wins DESC;

-- 查看選手勝率
SELECT 
  winner,
  COUNT(*) as wins
FROM `your_project.your_dataset.season3_game_details`
GROUP BY winner
ORDER BY wins DESC
LIMIT 10;
```

記得將 `your_project.your_dataset` 替換為你的實際專案和資料集名稱！
