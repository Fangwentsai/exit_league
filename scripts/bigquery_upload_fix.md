# BigQuery 上傳問題修正

## ❌ 問題原因
BigQuery 需要 **JSONL** (JSON Lines) 格式，每行一個 JSON 物件，而不是 JSON 陣列格式。

## ✅ 解決方案

### 使用正確的檔案
現在請使用這些 **JSONL 格式** 的檔案：
- ✅ `season3_match_results_jsonl.json` (比賽結果)
- ✅ `season3_game_details_jsonl.json` (詳細記錄)

### 正確的上傳步驟

1. **前往 BigQuery Console**：https://console.cloud.google.com/bigquery

2. **上傳比賽結果表格**：
   - 建立表格 → 來源：「上傳」
   - **檔案**：選擇 `season3_match_results_jsonl.json`
   - **檔案格式**：「JSON (換行符號分隔)」
   - **表格名稱**：`season3_match_results`
   - **Schema**：複製貼上以下內容

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

3. **上傳詳細記錄表格**：
   - 建立表格 → 來源：「上傳」
   - **檔案**：選擇 `season3_game_details_jsonl.json`
   - **檔案格式**：「JSON (換行符號分隔)」
   - **表格名稱**：`season3_game_details`
   - **Schema**：複製貼上以下內容

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

## 📊 格式差異說明

### ❌ 錯誤格式 (JSON 陣列)
```json
[
  {"game_id": "G01", "match_date": "2024/11/05"},
  {"game_id": "G02", "match_date": "2024/11/05"}
]
```

### ✅ 正確格式 (JSONL)
```json
{"game_id": "G01", "match_date": "2024/11/05"}
{"game_id": "G02", "match_date": "2024/11/05"}
```

## 🎯 預期結果
- **比賽結果表格**：56 筆記錄
- **詳細記錄表格**：896 筆記錄

現在應該可以成功上傳了！
