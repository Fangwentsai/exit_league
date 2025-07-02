# 難找的聯賽 Season 3 統計計算方法說明

## 概述
本文檔詳細說明難找的聯賽第三屆的統計計算方法、得分邏輯，以及用於生成最終統計數據的Python腳本。

---

## 🎯 計分規則

### 基本計分公式
**最終總分 = SET積分 + 勝場加成 + 飲酒加成**

### 1. SET積分計算
每場比賽包含16個SET，各SET的分數配置如下：

| SET編號 | 分數 | SET編號 | 分數 |
|---------|------|---------|------|
| SET 1   | 1分  | SET 9   | 1分  |
| SET 2   | 1分  | SET 10  | 3分  |
| SET 3   | 1分  | SET 11  | 2分  |
| SET 4   | 1分  | SET 12  | 2分  |
| SET 5   | 3分  | SET 13  | 2分  |
| SET 6   | 1分  | SET 14  | 2分  |
| SET 7   | 1分  | SET 15  | 4分  |
| SET 8   | 1分  | SET 16  | 4分  |

**SET積分 = Σ(贏得的各SET分數)**

### 2. 勝場加成
- **勝利**：+1分
- **敗北**：0分
- **和局**：0分

判定標準：僅以SET積分比較，不含飲酒加成
- SET積分較高者獲勝
- SET積分相同則為和局

### 3. 飲酒加成
根據各場比賽的實際飲酒情況給分，通常範圍0-5分。

---

## 📊 最終統計結果

### Season 3 排名表
| 排名 | 隊伍 | 勝 | 敗 | 和 | SET分 | 勝場分 | 飲酒分 | 總分 |
|------|------|----|----|----|----|----|----|------|
| 1 | Vivi朝酒晚舞 | 11 | 1 | 2 | 275 | 11 | 65 | **351** |
| 2 | 海盜揪硬 | 12 | 1 | 1 | 311 | 12 | 10 | **333** |
| 3 | 醉販 | 9 | 5 | 0 | 211 | 9 | 30 | **250** |
| 4 | 酒空組 | 6 | 7 | 1 | 199 | 6 | 27 | **232** |
| 5 | Jack | 4 | 10 | 0 | 169 | 4 | 57 | **230** |
| 6 | 逃生入口C | 5 | 9 | 0 | 190 | 5 | 22 | **217** |
| 7 | 逃生入口A | 5 | 8 | 1 | 183 | 5 | 20 | **208** |
| 8 | 人生揪難 | 1 | 12 | 1 | 142 | 1 | 47 | **190** |

### 數據驗證
- ✅ 總比賽場數：56場
- ✅ 總勝場 = 總敗場 = 53場
- ✅ 總和局：6場
- ✅ 總SET積分：1,680分
- ✅ 總勝場加成：53分
- ✅ 總飲酒加成：278分

---

## 🐍 Python計算腳本

### 1. 主要計算腳本

#### `scripts/create_firebase_season3_complete.py`
**用途**：生成最終的Firebase格式完整統計數據

**主要功能**：
```python
def create_firebase_complete_stats():
    """使用已驗證的正確數據創建Firebase格式的完整統計"""
    
    # 讀取已驗證的正確統計數據
    with open('season3_final_correct_stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 處理隊伍統計，添加勝場加成
    for team_name, team_stats in teams_data.items():
        win_bonus = team_stats['wins']  # 勝場加成 = 勝場數
        updated_final_score = team_stats['total_points'] + win_bonus + team_stats['drinking_bonus']
        
    # 處理每場比賽，添加勝場加成
    for match in team_stats['matches']:
        match_win_bonus = 1 if match['result'] == 'win' else 0
        updated_total = match['points'] + match_win_bonus + match['drinking']
```

**關鍵邏輯**：
1. 讀取基礎統計數據（SET積分 + 飲酒加成）
2. 為每支隊伍添加勝場加成（勝場數 × 1分）
3. 重新計算最終總分
4. 生成Firebase格式的完整數據

#### `scripts/calculate_complete_season3_stats.py`
**用途**：從HTML比賽文件解析完整統計（備用腳本）

**主要功能**：
```python
def parse_game_html(file_path):
    """解析單場比賽HTML文件"""
    # 提取比賽基本資訊
    # 解析JavaScript中的比賽數據
    # 計算SET勝負和得分
    # 判定比賽勝負
    
def calculate_set_score(sets_won):
    """根據勝場數計算SET得分"""
    set_scores = [1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4]
    return sum(set_scores[:sets_won])
```

### 2. 數據文件結構

#### 輸入文件
- `season3_final_correct_stats.json`：已驗證的基礎統計數據
- `game_result/season3/g01.html` ~ `g56.html`：56場比賽的HTML文件

#### 輸出文件
- `firebase_data/season3_complete_final.json`：完整的Firebase格式統計數據

### 3. Firebase數據結構
```json
{
  "season3_complete_stats": {
    "last_updated": "2024-12-26",
    "total_matches": 56,
    "scoring_rules": {
      "set_scores": [1,1,1,1,3,1,1,1,1,3,2,2,2,2,4,4],
      "win_bonus": 1,
      "drinking_bonus": "varies_by_team_and_match"
    },
    "teams": {
      "隊伍名稱": {
        "name": "隊伍名稱",
        "wins": 勝場數,
        "losses": 敗場數,
        "draws": 和局數,
        "set_points": SET積分,
        "win_bonus": 勝場加成,
        "drinking_bonus": 飲酒加成,
        "final_score": 最終總分,
        "matches": [比賽詳細資料]
      }
    },
    "all_matches": [所有比賽記錄]
  }
}
```

---

## 🔧 執行步驟

### 1. 生成完整統計
```bash
cd /Users/tsaifang-wen/Cursor/schedule
python3 scripts/create_firebase_season3_complete.py
```

### 2. 驗證數據
腳本會自動進行數據驗證：
- 檢查勝敗平衡（總勝場 = 總敗場）
- 計算各項積分總和
- 確認比賽場數正確

### 3. 使用API
在網頁中引入 `js/season3-api.js` 後可直接調用：
```javascript
// 獲取排名
const rankings = await getSeason3Rankings();

// 獲取隊伍詳情
const teamDetails = await getSeason3TeamDetails('Vivi朝酒晚舞');

// 獲取所有比賽
const allMatches = await getSeason3AllMatches();
```

---

## 🎲 重要修正案例

### G34場次修正
**問題**：Vivi朝酒晚舞 vs 酒空組，SET得分15-15，應為和局但原統計顯示為勝負

**修正邏輯**：
```python
# 判定勝負僅看SET積分
if away_score > home_score:
    winner = away_team
    away_win_bonus = 1
    home_win_bonus = 0
elif home_score > away_score:
    winner = home_team
    away_win_bonus = 0
    home_win_bonus = 1
else:  # SET積分相同 = 和局
    winner = "draw"
    away_win_bonus = 0
    home_win_bonus = 0
```

**結果**：
- Vivi朝酒晚舞：15分SET + 0分勝場 + 5分飲酒 = 20分
- 酒空組：15分SET + 0分勝場 + 0分飲酒 = 15分
- 判定：和局 ✅

### G54場次修正
**問題**：酒空組的2分飲酒加成未計入

**修正前**：酒空組 8分SET + 0分勝場 + 0分飲酒 = 8分
**修正後**：酒空組 22分SET + 1分勝場 + 2分飲酒 = 25分

---

## 📁 相關文件清單

### Python腳本
- `scripts/create_firebase_season3_complete.py` - 主要統計生成腳本
- `scripts/calculate_complete_season3_stats.py` - HTML解析腳本（備用）

### 數據文件
- `season3_final_correct_stats.json` - 基礎統計數據
- `firebase_data/season3_complete_final.json` - 完整統計數據

### API文件
- `js/season3-api.js` - JavaScript API接口

### 比賽文件
- `game_result/season3/g01.html` ~ `g56.html` - 56場比賽記錄

---

## 🔍 數據驗證方法

### 手動驗證步驟
1. **勝敗平衡檢查**：總勝場數 = 總敗場數
2. **比賽場次檢查**：每隊14場比賽，總計56場
3. **積分合理性檢查**：SET積分符合預期範圍
4. **特殊場次檢查**：和局場次的處理是否正確

### 自動驗證輸出
```
=== 數據驗證 ===
總比賽場數：56
總勝場：53, 總敗場：53, 總和局：6
勝敗平衡：✅
總SET積分：1680
總勝場加成：53
總飲酒加成：278
```

---

## 📝 更新記錄

- **2024-12-26**：建立完整的計分系統
- **2024-12-26**：修正G34和G54場次統計錯誤
- **2024-12-26**：創建Firebase格式API
- **2024-12-26**：完成數據驗證和文檔撰寫

---

> **注意**：本統計系統已通過完整的數學驗證，確保所有數據的準確性和一致性。任何對統計方法的修改都應重新運行驗證腳本以確保數據完整性。 