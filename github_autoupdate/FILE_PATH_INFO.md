# 文件上傳路徑說明

## 📍 上傳後的絕對路徑

### GitHub Repository 路徑

根據你的配置：
- **Repository**: `Fangwentsai/exit_league`
- **分支**: `main`
- **預設賽季**: `season6`

### 文件路徑格式

```
game_result/{season}/{gameId}.html
```

### 實際範例

假設比賽 ID 是 `g90`：

**相對路徑（Repository 內）**：
```
game_result/season6/g90.html
```

**GitHub 網頁 URL**：
```
https://github.com/Fangwentsai/exit_league/blob/main/game_result/season6/g90.html
```

**GitHub Raw URL（原始文件）**：
```
https://raw.githubusercontent.com/Fangwentsai/exit_league/main/game_result/season6/g90.html
```

**GitHub API URL**：
```
https://api.github.com/repos/Fangwentsai/exit_league/contents/game_result/season6/g90.html
```

## 📂 目錄結構

```
exit_league/                    ← Repository 根目錄
└── game_result/               ← 比賽結果目錄
    ├── season5/               ← 第五季
    │   ├── g01.html
    │   ├── g02.html
    │   └── ...
    └── season6/               ← 第六季（預設）
        ├── g89.html           ← 範例
        ├── g90.html           ← 新上傳的文件
        └── ...
```

## 🔍 如何查看上傳的文件

### 方法 1：GitHub 網頁

1. 前往：https://github.com/Fangwentsai/exit_league
2. 點擊 `game_result` 資料夾
3. 點擊 `season6` 資料夾
4. 找到你的文件（例如：`g90.html`）

### 方法 2：直接 URL

如果知道比賽 ID，可以直接訪問：
```
https://github.com/Fangwentsai/exit_league/blob/main/game_result/season6/{gameId}.html
```

例如：
- `g90`: https://github.com/Fangwentsai/exit_league/blob/main/game_result/season6/g90.html
- `g89`: https://github.com/Fangwentsai/exit_league/blob/main/game_result/season6/g89.html

### 方法 3：使用 Raw URL（原始 HTML）

如果需要直接訪問 HTML 內容：
```
https://raw.githubusercontent.com/Fangwentsai/exit_league/main/game_result/season6/{gameId}.html
```

## 📝 路徑生成邏輯

在 `google-apps-script-complete.js` 中：

```javascript
// 第 176-177 行
const season = getSeasonFromGameId(data.gameId) || 'season6';
const filePath = `game_result/${season}/${gameCode.toLowerCase()}.html`;
```

### 賽季判斷

目前 `getSeasonFromGameId()` 函數預設返回 `season6`。

如果需要根據比賽編號自動判斷，可以修改：

```javascript
function getSeasonFromGameId(gameId) {
  const gameNum = parseInt(gameId.replace(/\D/g, ''));
  if (gameNum >= 1 && gameNum <= 56) {
    return 'season5';
  } else if (gameNum >= 57) {
    return 'season6';
  }
  return 'season6';  // 預設
}
```

## 🔗 完整 URL 範例

假設上傳 `g90` 比賽結果：

| 類型 | URL |
|------|-----|
| GitHub 網頁 | `https://github.com/Fangwentsai/exit_league/blob/main/game_result/season6/g90.html` |
| Raw 文件 | `https://raw.githubusercontent.com/Fangwentsai/exit_league/main/game_result/season6/g90.html` |
| GitHub API | `https://api.github.com/repos/Fangwentsai/exit_league/contents/game_result/season6/g90.html` |

## 📊 上傳後的回應

Google Apps Script 會返回：

```json
{
  "status": "success",
  "gameId": "g90",
  "htmlSheetName": "g90.html",
  "htmlSheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "githubUpload": {
    "success": true,
    "filePath": "game_result/season6/g90.html",
    "fileUrl": "https://github.com/Fangwentsai/exit_league/blob/main/game_result/season6/g90.html",
    "commitUrl": "https://github.com/Fangwentsai/exit_league/commit/..."
  }
}
```

## ✅ 驗證文件是否上傳成功

1. **檢查 Google Apps Script 執行記錄**
   - 應該看到「✅ GitHub 上傳成功」

2. **檢查 GitHub Repository**
   - 前往：https://github.com/Fangwentsai/exit_league/tree/main/game_result/season6
   - 確認文件是否存在

3. **檢查文件內容**
   - 點擊文件查看內容
   - 確認格式與 `g89.html` 一致

## 🔧 修改路徑

如果需要修改路徑，可以：

1. **修改賽季判斷邏輯**
   - 編輯 `getSeasonFromGameId()` 函數

2. **修改基礎路徑**
   - 修改第 177 行的 `filePath` 變數
   - 例如：`const filePath = `custom_path/${season}/${gameCode.toLowerCase()}.html`;`

3. **修改檔案名稱格式**
   - 修改第 177 行的檔案名稱部分
   - 例如：`${gameCode.toUpperCase()}.html` 或 `${gameCode}_result.html`
