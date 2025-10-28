# 覆蓋現有表格資料

## 🔄 在 BigQuery Web UI 中：

1. **CREATE TABLE**
2. **Source**: Upload
3. **File**: `season3_game_details_individual.json`
4. **Destination**:
   - Project: 你的專案
   - Dataset: 你的資料集
   - Table: `season3_game_details_individual` (相同名稱)
5. **Write preference**: **Overwrite table** ⚠️
6. **File format**: JSONL
7. 點擊 **CREATE TABLE**

## ⚡ 使用命令列：

```bash
# 覆蓋現有表格
bq load \
  --replace \
  --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  your_project:your_dataset.season3_game_details_individual \
  season3_game_details_individual.json
```

## 📊 驗證更新

更新後執行這個查詢驗證：

```sql
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT game_id) as total_games,
  COUNT(DISTINCT CONCAT(game_id, '_', set_id)) as total_sets
FROM `your_project.your_dataset.season3_game_details_individual`
```

**預期結果**：
- `total_records`: 3,360
- `total_games`: 56  
- `total_sets`: 896
