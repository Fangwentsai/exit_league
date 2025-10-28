# 簡化版 Schema (前台上傳用)

## 比賽結果表格 Schema (season3_match_results)

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

## 詳細記錄表格 Schema (season3_game_details)

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

## 快速上傳步驟

1. **BigQuery Console** → https://console.cloud.google.com/bigquery
2. **建立表格** → 選擇「上傳」
3. **檔案格式** → 「JSON (換行符號分隔)」
4. **Schema** → 「以文字形式編輯」→ 貼上上面的 Schema
5. **建立表格**

## 預期結果
- `season3_match_results`: 56 筆
- `season3_game_details`: 896 筆
