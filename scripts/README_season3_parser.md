# Season 3 資料解析器

這個 Python 腳本用於解析 `game_result/season3/` 目錄下的所有 HTML 檔案，並生成兩個 JSON 檔案供 BigQuery 使用。

## 📁 輸出檔案

### 1. season3_match_results.json (56筆)
每場比賽的總結果，包含：
- `game_id`: 比賽編號 (G01-G56)
- `match_date`: 比賽日期
- `team1`, `team2`: 對戰隊伍
- `winner`, `loser`: 勝負隊伍
- `victory_bonus`: 勝場加成
- `drinking_bonus`: 飲酒加成
- `total_games`: 總局數
- `created_at`: 建立時間

### 2. season3_game_details.json (預計896筆)
每場比賽的詳細對戰記錄，包含：
- `game_id`: 比賽編號
- `record_index`: 記錄索引
- `player1`, `player2`: 對戰選手
- `game_type`: 比賽類型 (01/CR)
- `first_attack`: 先後攻
- `winner`: 該局勝者
- `score`: 比分
- `created_at`: 建立時間

### 3. season3_statistics.json
統計報告，包含解析結果摘要

## 🚀 使用方法

### 方法一：使用執行腳本 (推薦)
```bash
cd scripts
./run_season3_parser.sh
```

### 方法二：手動執行
```bash
cd scripts

# 安裝套件
pip3 install -r requirements_parser.txt

# 執行解析
python3 parse_season3_data.py
```

## 📋 前置需求

1. **Python 3.7+**
2. **必要套件**：
   - beautifulsoup4
   - lxml
   - html5lib

3. **檔案結構**：
   ```
   exit_league/
   ├── game_result/
   │   └── season3/
   │       ├── g01.html
   │       ├── g02.html
   │       └── ... (g01-g56)
   └── scripts/
       ├── parse_season3_data.py
       ├── requirements_parser.txt
       └── run_season3_parser.sh
   ```

## 🔧 解析邏輯

### HTML 解析策略
1. **使用 BeautifulSoup** 解析 HTML 結構
2. **多重解析模式**：
   - 表格格式解析
   - 文字模式解析
   - 替代格式解析

### 資料提取方法
- **隊伍名稱**：從標題或 vs 格式中提取
- **勝負結果**：搜尋包含「勝」「敗」關鍵字的元素
- **選手資訊**：從表格行或文字中提取對戰記錄
- **比賽類型**：識別 01 或 CR 比賽
- **加成資訊**：搜尋加成相關文字並提取數字

## 📊 輸出範例

### 比賽結果範例
```json
{
  "game_id": "G01",
  "match_date": "2024/8/5",
  "team1": "逃生入口A",
  "team2": "VIVI哈哈隊",
  "winner": "逃生入口A",
  "loser": "VIVI哈哈隊",
  "victory_bonus": 3,
  "drinking_bonus": 0,
  "total_games": 16,
  "created_at": "2024-10-28T10:30:00"
}
```

### 詳細記錄範例
```json
{
  "game_id": "G01",
  "record_index": 1,
  "player1": "張三",
  "player2": "李四",
  "game_type": "01",
  "first_attack": "先攻",
  "winner": "張三",
  "score": "2-1",
  "created_at": "2024-10-28T10:30:00"
}
```

## 🐛 故障排除

### 常見問題

1. **找不到 HTML 檔案**
   - 確認 `game_result/season3/` 目錄存在
   - 檢查檔案命名是否正確 (g01.html - g56.html)

2. **解析結果不完整**
   - HTML 格式可能與預期不同
   - 檢查日誌輸出找出具體錯誤

3. **套件安裝失敗**
   ```bash
   pip3 install --upgrade pip
   pip3 install -r requirements_parser.txt
   ```

### 除錯模式
修改腳本中的日誌級別：
```python
logging.basicConfig(level=logging.DEBUG)
```

## 🔄 後續步驟

1. **檢查生成的 JSON 檔案**
2. **驗證資料完整性**
3. **上傳至 BigQuery**：
   ```bash
   # 使用之前建立的 BigQuery 匯入腳本
   python sheets_to_bigquery.py
   ```

## 📈 擴展功能

- 支援其他賽季 (Season 4, Season 5)
- 自動化資料驗證
- 與 BigQuery 直接整合
- 增加更多統計分析

