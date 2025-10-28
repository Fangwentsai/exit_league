# BigQuery 載入指令

## 1. 載入比賽結果資料

```bash
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --schema=season3_match_results_schema.json \
  --replace \
  your_dataset.season3_match_results \
  season3_match_results.json
```

## 2. 載入詳細記錄資料

```bash
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --schema=season3_game_details_schema.json \
  --replace \
  your_dataset.season3_game_details \
  season3_game_details.json
```

## 使用說明

1. 將 `your_dataset` 替換為你的 BigQuery 資料集名稱
2. 確保所有檔案都在同一個目錄下：
   - `season3_match_results.json`
   - `season3_match_results_schema.json`
   - `season3_game_details.json`
   - `season3_game_details_schema.json`

## 檔案說明

### Schema 檔案
- `season3_match_results_schema.json`: 比賽結果表格的欄位定義
- `season3_game_details_schema.json`: 詳細記錄表格的欄位定義

### 資料檔案
- `season3_match_results.json`: 56 筆比賽結果
- `season3_game_details.json`: 896 筆詳細對戰記錄

## 欄位說明

### 比賽結果表 (season3_match_results)
- `away_team_score` / `home_team_score`: 根據 set 計分規則的實際比分
- `away_team_final_score` / `home_team_final_score`: 最終總分 (比分 + 加成)
- `victory_bonus_team` / `drinking_bonus_team`: 獲得加成的隊伍

### 詳細記錄表 (season3_game_details)
- `set_id`: 局次編號 (1-16)
- `away_is_winner` / `home_is_winner`: 該局勝負狀況
- `first_attack_player`: 該局先攻選手
