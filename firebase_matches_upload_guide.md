# Firebase Matches資料上傳指南

## 🎯 目標
將100場比賽資料上傳到Firebase，按季節分類存放：
- `matches/season3/games/` (56場比賽)
- `matches/season4/games/` (44場比賽)

## 🔐 Firebase權限設定

### 方法一：服務帳戶金鑰（推薦）

1. **下載服務帳戶金鑰：**
   - 前往 [Firebase Console](https://console.firebase.google.com/)
   - 選擇您的專案
   - 齒輪圖示 → 專案設定 → 服務帳戶
   - 點擊「產生新的私密金鑰」
   - 下載JSON檔案（例如：`service-account-key.json`）

2. **執行上傳：**
   ```bash
   python3 scripts/firebase_matches_uploader.py /path/to/service-account-key.json
   ```

### 方法二：Google Cloud CLI

1. **安裝並設定：**
   ```bash
   # 安裝（如果尚未安裝）
   brew install google-cloud-sdk
   
   # 登入
   gcloud auth login
   
   # 設定專案
   gcloud config set project YOUR_PROJECT_ID
   
   # 設定應用程式憑證
   gcloud auth application-default login
   ```

2. **執行上傳：**
   ```bash
   python3 scripts/firebase_matches_uploader.py
   ```

## 📊 上傳前的資料檢查

腳本會在上傳前顯示：
- 季節分布統計
- 場地和隊伍名稱列表
- 可能重複的名稱
- 資料品質問題

**發現的問題：**
- 場地名稱需要標準化（如 `逃生入口Bar` → `逃生入口 Bar`）
- 隊伍名稱需要標準化（如 `海盜揪硬` → `酒窩海盜聯盟`）

## 🚀 執行步驟

1. **確認資料準備好：**
   ```bash
   ls firebase_data/matches.json
   ```

2. **執行資料品質檢查：**
   ```bash
   python3 scripts/data_quality_checker.py
   ```

3. **手動修正資料問題**（建議）

4. **上傳到Firebase：**
   ```bash
   python3 scripts/firebase_matches_uploader.py [service-account-key.json]
   ```

5. **在Firebase Console確認資料**

## 📁 最終Firebase結構

```
matches/
├── season3/
│   ├── metadata (季節統計)
│   └── games/
│       ├── g001 (比賽資料)
│       ├── g002
│       └── ... (共56場)
└── season4/
    ├── metadata (季節統計)
    └── games/
        ├── g001 (比賽資料)
        ├── g002
        └── ... (共44場)
```

## 📋 每場比賽的資料結構

```json
{
  "game_number": 1,
  "date": "2024/11/05 21:00",
  "venue": "逃生入口 Bar",
  "away_team": "逃生入口A",
  "home_team": "逃生入口C",
  "away_score": 0,
  "home_score": 0,
  "sets": [...],
  "drinking_bonus": {...},
  "away_players": [...],
  "home_players": [...],
  "total_sets": 10,
  "away_sets_won": 0,
  "home_sets_won": 0,
  "created_at": "SERVER_TIMESTAMP",
  "updated_at": "SERVER_TIMESTAMP"
}
```

## ⚠️ 注意事項

1. **資料備份：** 上傳前請確保有本地備份
2. **權限檢查：** 確保Firebase專案權限正確
3. **手動修正：** 建議先手動修正隊名和場地名稱
4. **分批上傳：** 腳本支援批次寫入，單次最多500筆

## 🔧 故障排除

- **權限錯誤：** 檢查服務帳戶金鑰或Google Cloud CLI設定
- **網路問題：** 確保網路連線穩定
- **資料格式：** 確認matches.json格式正確
- **專案ID：** 確認Firebase專案ID正確 