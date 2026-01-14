# API 參考文檔

本文檔列出所有 API 的位置、配置和使用方式。

## 📍 API 位置總覽

### 1. Google Apps Script API

**Web App URL（已配置）**：
```
https://script.google.com/macros/s/AKfycbw96zr198osWO2HIeFbKMaHaM3-WqkHcDJ1F_OmTJdulf3Euv2E9K7LrdRpMORMr5lW/exec
```

**配置位置**：
- `github_autoupdate/config.json` → `googleAppsScript.webAppUrl`
- `js/admin-sheets-api.js` → `SCRIPT_URL` (第15行)
- `js/admin-main.js` → `saveToGoogleSheetsWithHTML()` 函數中 (第1054行)

**代碼位置**：
- `google-apps-script-complete.js` - 完整的 Google Apps Script 代碼
- `google-apps-script-github.js` - GitHub 上傳功能
- `google-apps-script-test.js` - 測試函數

**查看方式**：
1. 前往 [Google Apps Script](https://script.google.com/)
2. 打開你的專案
3. 查看代碼和執行記錄

---

### 2. GitHub API

**API 端點**：
```
https://api.github.com/repos/{owner}/{repo}/contents/{path}
```

**配置位置**：
- `github_autoupdate/config.json` → `github` 區塊
- `js/github-api.js` → `GITHUB_CONFIG` (第7-15行)

**代碼位置**：
- `js/github-api.js` - GitHub API 處理模組
- `google-apps-script-complete.js` - `uploadFileToGitHub()` 函數

**官方文檔**：
- [GitHub REST API 文檔](https://docs.github.com/en/rest)
- [Contents API](https://docs.github.com/en/rest/repos/contents)

**查看 Token**：
1. 前往 [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. 查看或生成新的 Token

---

### 3. Google Sheets API

**配置位置**：
- `js/admin-sheets-api.js` → `SHEETS_CONFIG` (第7-12行)

**Sheet IDs**：
- 賽程表：`1xb6UmcQ4ueQcCn_dHW8JJ9H2Ya2Mp94HdJqz90BlEEY`
- 比賽結果：`1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE`

**代碼位置**：
- `js/admin-sheets-api.js` - Google Sheets API 處理模組

**查看方式**：
1. 打開 Google Sheets
2. 從 URL 中可以看到 Sheet ID
3. 例如：`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

---

### 4. Shopee Affiliate API

**API 端點**：
```
https://open-api.affiliate.shopee.tw
```

**代碼位置**：
- `api/shopee-products.js` - Shopee API 處理

**官方文檔**：
- [Shopee Affiliate Open API 文檔](https://affiliate.shopee.tw/open_api/document)

**配置**：
- 環境變數：`SHOPEE_APP_ID`、`SHOPEE_SECRET_KEY`

---

## 🔍 如何查看 API 配置

### 方法 1：查看配置文件

```bash
# 查看 GitHub 配置
cat github_autoupdate/config.json

# 查看 Google Sheets 配置
grep -A 5 "SHEETS_CONFIG" js/admin-sheets-api.js
```

### 方法 2：在代碼中查看

**Google Apps Script URL**：
- 檔案：`js/admin-main.js`
- 行數：1054
- 變數：`scriptURL`

**GitHub 配置**：
- 檔案：`js/github-api.js`
- 行數：7-15
- 變數：`GITHUB_CONFIG`

**Google Sheets 配置**：
- 檔案：`js/admin-sheets-api.js`
- 行數：7-12
- 變數：`SHEETS_CONFIG`

### 方法 3：在瀏覽器中查看

1. 打開瀏覽器開發者工具（F12）
2. 切換到「Network」標籤
3. 執行相關操作（例如：保存比賽）
4. 查看發送的 API 請求

---

## 📝 API 請求格式

### Google Apps Script API

**請求方式**：`POST`

**URL**：
```
https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

**Headers**：
```javascript
{
  'Content-Type': 'text/plain'
}
```

**Body**：
```json
{
  "gameId": "g89",
  "homeTeam": "逃生入口A",
  "awayTeam": "海盜揪硬",
  "htmlContent": "<!DOCTYPE html>...",
  "htmlSheetName": "g89.html",
  "playerStats": { "away": [], "home": [] },
  "timestamp": "2025-01-01 12-00-00"
}
```

### GitHub API

**請求方式**：`PUT`

**URL**：
```
https://api.github.com/repos/{owner}/{repo}/contents/{path}
```

**Headers**：
```javascript
{
  'Authorization': 'token {GITHUB_TOKEN}',
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
}
```

**Body**：
```json
{
  "message": "Add g89 game result",
  "content": "{base64_encoded_content}",
  "branch": "main",
  "sha": "{file_sha_if_updating}"
}
```

---

## 🧪 測試 API

### 測試 Google Apps Script API

1. 打開 `google-apps-script-test.js`
2. 執行 `testG89FormatToSheets()` 函數
3. 查看執行記錄

### 測試 GitHub API

1. 在 Google Apps Script 中執行 `testGitHubUpload()` 函數
2. 查看執行記錄
3. 檢查 GitHub Repository 是否出現新檔案

---

## 🔐 API 安全注意事項

1. **不要在前端暴露敏感資訊**
   - GitHub Token 應該保存在 Google Apps Script 的 Script Properties
   - 不要在前端代碼中硬編碼 Token

2. **使用環境變數**
   - Shopee API 使用環境變數
   - Google Apps Script 使用 Script Properties

3. **檢查權限**
   - GitHub Token 只需要 `repo` 權限
   - Google Apps Script 需要適當的執行權限

---

## 📚 相關文檔

- `README.md` - GitHub 配置說明
- `SETUP_GAS.md` - Google Apps Script 設置指南
- `CHECKLIST.md` - 設置檢查清單
- `../GITHUB_SETUP.md` - GitHub API 詳細設置
- `../GAS_SETUP_GUIDE.md` - Google Apps Script 設置指南

---

## 🆘 常見問題

### Q: 如何找到 Google Apps Script 的 Web App URL？
A: 
1. 前往 [Google Apps Script](https://script.google.com/)
2. 打開你的專案
3. 點擊「部署」→「管理部署作業」
4. 複製「網頁應用程式 URL」

### Q: 如何查看 GitHub API 請求？
A: 
1. 打開瀏覽器開發者工具（F12）
2. 切換到「Network」標籤
3. 執行相關操作
4. 搜尋 `api.github.com` 的請求

### Q: 如何查看 Google Apps Script 的執行記錄？
A: 
1. 前往 [Google Apps Script](https://script.google.com/)
2. 打開你的專案
3. 點擊左側的「執行」（Executions）
4. 查看最近的執行記錄
