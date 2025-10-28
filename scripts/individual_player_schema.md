# 個人化選手記錄 Schema

## 📊 新的資料結構

### 原始問題
- ❌ `record_index`: 不需要的技術欄位
- ❌ 多人比賽用逗號分隔: `Lucas, Jesse, Terry` → 難以統計個人勝率

### 解決方案
- ✅ 移除 `record_index` 欄位
- ✅ 多人比賽拆分成個別選手記錄
- ✅ 每個選手都有獨立的勝負記錄

## 📋 BigQuery Schema (個人化版本)

```json
[
  {"name": "game_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "set_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "set_info", "type": "STRING", "mode": "REQUIRED"},
  {"name": "away_player", "type": "STRING", "mode": "REQUIRED"},
  {"name": "home_player", "type": "STRING", "mode": "REQUIRED"},
  {"name": "game_type", "type": "STRING", "mode": "REQUIRED"},
  {"name": "game_mode", "type": "STRING", "mode": "REQUIRED"},
  {"name": "first_attack_player", "type": "STRING", "mode": "REQUIRED"},
  {"name": "winner", "type": "STRING", "mode": "REQUIRED"},
  {"name": "away_is_winner", "type": "BOOLEAN", "mode": "REQUIRED"},
  {"name": "home_is_winner", "type": "BOOLEAN", "mode": "REQUIRED"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "REQUIRED"}
]
```

## 📈 統計查詢範例

### 個人勝率統計
```sql
SELECT 
  player_name,
  total_games,
  wins,
  ROUND(wins * 100.0 / total_games, 2) as win_percentage
FROM (
  SELECT 
    CASE 
      WHEN away_player NOT LIKE '%,%' THEN away_player
      WHEN home_player NOT LIKE '%,%' THEN home_player
    END as player_name,
    COUNT(*) as total_games,
    SUM(CASE 
      WHEN (away_player NOT LIKE '%,%' AND winner = away_player) OR 
           (home_player NOT LIKE '%,%' AND winner = home_player) 
      THEN 1 ELSE 0 END) as wins
  FROM season3_game_details_individual
  WHERE (away_player NOT LIKE '%,%') OR (home_player NOT LIKE '%,%')
  GROUP BY player_name
) stats
WHERE total_games >= 5
ORDER BY win_percentage DESC;
```

### 各比賽類型勝率
```sql
SELECT 
  player_name,
  game_type,
  COUNT(*) as games,
  SUM(CASE WHEN winner = player_name THEN 1 ELSE 0 END) as wins,
  ROUND(SUM(CASE WHEN winner = player_name THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as win_rate
FROM (
  SELECT 
    CASE 
      WHEN away_player NOT LIKE '%,%' THEN away_player
      WHEN home_player NOT LIKE '%,%' THEN home_player
    END as player_name,
    game_type,
    winner
  FROM season3_game_details_individual
  WHERE (away_player NOT LIKE '%,%') OR (home_player NOT LIKE '%,%')
) player_games
GROUP BY player_name, game_type
HAVING games >= 3
ORDER BY player_name, win_rate DESC;
```

## 📊 資料統計
- **原始記錄**: 896 筆 (包含多人比賽)
- **個人化記錄**: 2,698 筆 (每個選手獨立記錄)
- **檔案**: `season3_game_details_individual.json`
