# 🔥 Firebase設定指南

## 📋 目錄
1. [建立Firebase專案](#建立firebase專案)
2. [設定Firestore資料庫](#設定firestore資料庫)
3. [取得服務帳戶金鑰](#取得服務帳戶金鑰)
4. [安裝依賴套件](#安裝依賴套件)
5. [上傳資料](#上傳資料)
6. [資料結構說明](#資料結構說明)
7. [後續整合](#後續整合)

## 🚀 建立Firebase專案

### 1. 前往Firebase Console
- 開啟 [Firebase Console](https://console.firebase.google.com/)
- 使用Google帳號登入

### 2. 建立新專案
- 點擊「建立專案」
- 輸入專案名稱：`dart-league-manager` (或您喜歡的名稱)
- 選擇是否啟用Google Analytics (建議啟用)
- 點擊「建立專案」

## 🗄️ 設定Firestore資料庫

### 1. 啟用Firestore
- 在Firebase Console中，選擇您的專案
- 點擊左側選單的「Firestore Database」
- 點擊「建立資料庫」

### 2. 選擇安全性規則
- **測試模式**：允許所有讀寫 (30天後自動鎖定)
- **生產模式**：需要驗證才能存取
- 建議先選擇「測試模式」進行初始設定

### 3. 選擇位置
- 建議選擇 `asia-east1` (台灣) 或 `asia-southeast1` (新加坡)
- 位置設定後無法更改

## 🔑 取得服務帳戶金鑰

### 1. 前往專案設定
- 點擊Firebase Console左上角的齒輪圖示
- 選擇「專案設定」

### 2. 建立服務帳戶
- 點擊「服務帳戶」標籤
- 點擊「產生新的私密金鑰」
- 下載JSON檔案並安全保存
- 將檔案重新命名為 `firebase-service-account.json`
- 放置在專案根目錄 (與`scripts`資料夾同層)

### 3. 設定環境變數 (替代方案)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/firebase-service-account.json"
```

## 📦 安裝依賴套件

```bash
# 安裝Firebase Admin SDK
python3 -m pip install firebase-admin

# 確認已安裝BeautifulSoup4 (解析HTML用)
python3 -m pip install beautifulsoup4
```

## 📤 上傳資料

### 1. 確認資料已解析
```bash
# 先執行HTML解析 (如果還沒執行過)
python3 scripts/html_to_firebase.py
```

### 2. 上傳到Firebase
```bash
# 使用服務帳戶金鑰
python3 scripts/firebase_uploader.py firebase-service-account.json

# 或使用環境變數
python3 scripts/firebase_uploader.py
```

### 3. 預期輸出
```
🎯 Firebase資料上傳器
==================================================
✅ Firebase連接成功
📊 載入資料: 100 場比賽, 148 位選手
📤 開始上傳比賽資料...
✅ 比賽資料上傳完成: 100 場比賽
📤 開始上傳選手資料...
✅ 選手資料上傳完成: 148 位選手
📤 上傳摘要資料...
✅ 摘要資料上傳完成

🎉 所有資料上傳完成！
📊 總計: 100 場比賽, 148 位選手
🔗 請到Firebase Console查看資料
```

## 📊 資料結構說明

### 1. Collections (集合)

#### `matches` - 比賽資料
```javascript
{
  // 文檔ID: season3_g001, season4_g001, etc.
  season: "season3",
  game_number: 1,
  date: "2024/11/05 21:00",
  venue: "逃生入口Exit Bar",
  away_team: "逃生入口A",
  home_team: "逃生入口C",
  away_score: 0,
  home_score: 0,
  matches: [
    {
      set: 1,
      type: "01", // "01" 或 "CR"
      away: "Lucas", // 字串或陣列
      home: "隼隼",
      firstAttack: "home", // "home" 或 "away"
      winner: "away" // "home" 或 "away"
    }
    // ... 更多SET
  ],
  drinking_bonus: {
    away: 5,
    home: 0
  },
  away_players: ["Lucas", "Terry", "Jesse", "Eric"],
  home_players: ["隼隼", "阿仁", "禹辰", "華華", "Ace"],
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `players` - 選手資料
```javascript
{
  // 文檔ID: 選手名稱
  name: "Lucas",
  total_games: 45,
  total_wins: 23,
  o1_games: 25,
  o1_wins: 12,
  cr_games: 20,
  cr_wins: 11,
  first_attacks: 22,
  seasons: ["season3", "season4"],
  teams: ["逃生入口A"],
  win_rate: 51.11, // 總勝率
  o1_win_rate: 48.00, // 01遊戲勝率
  cr_win_rate: 55.00, // Cricket勝率
  created_at: timestamp,
  updated_at: timestamp
}
```

#### `metadata` - 摘要資料
```javascript
{
  // 文檔ID: summary
  total_matches: 100,
  total_players: 148,
  seasons: ["season3", "season4"],
  players_list: ["Ace", "Lucas", "Terry", ...],
  last_updated: timestamp,
  data_source: "html_parser",
  version: "1.0"
}
```

### 2. 建議的索引

在Firebase Console > Firestore > 索引中建立：

#### matches集合
- `season` (Ascending) + `game_number` (Ascending)
- `venue` (Ascending) + `date` (Ascending)
- `away_team` (Ascending) + `date` (Ascending)
- `home_team` (Ascending) + `date` (Ascending)

#### players集合
- `total_games` (Descending)
- `total_wins` (Descending)
- `win_rate` (Descending)
- `seasons` (Array-contains) + `total_games` (Descending)
- `teams` (Array-contains) + `total_wins` (Descending)

## 🔗 後續整合

### 1. 網頁端查詢範例
```javascript
// 取得所有比賽
const matches = await db.collection('matches')
  .orderBy('season')
  .orderBy('game_number')
  .get();

// 取得特定選手資料
const player = await db.collection('players')
  .doc('Lucas')
  .get();

// 取得勝率排行榜
const topPlayers = await db.collection('players')
  .where('total_games', '>=', 10)
  .orderBy('win_rate', 'desc')
  .limit(20)
  .get();
```

### 2. 管理後台整合
- 可以修改 `admin.html` 直接寫入Firebase
- 即時更新選手統計
- 自動計算排行榜

### 3. 安全性設定
上傳完成後，建議修改Firestore規則：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允許讀取所有資料
    match /{document=**} {
      allow read: if true;
    }
    
    // 只允許管理員寫入
    match /{document=**} {
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## 🎯 完成檢查清單

- [ ] Firebase專案建立完成
- [ ] Firestore資料庫啟用
- [ ] 服務帳戶金鑰下載並設定
- [ ] Python依賴套件安裝
- [ ] HTML資料解析完成
- [ ] Firebase資料上傳成功
- [ ] Firebase Console確認資料正確
- [ ] 索引建立完成
- [ ] 安全性規則設定

## 🚨 注意事項

1. **服務帳戶金鑰安全**：請勿將金鑰檔案提交到Git
2. **Firestore配額**：免費方案有讀寫次數限制
3. **索引建立**：複合索引需要時間建立，請耐心等候
4. **資料備份**：建議定期匯出Firestore資料作為備份
5. **成本控制**：監控Firebase使用量，避免超出免費額度

---

🎉 **恭喜！您已成功將所有比賽資料整理到Firebase！**

現在可以開始開發更進階的功能，如即時排行榜、選手分析、比賽預測等！ 