# Google Apps Script 設置指南

## 📋 步驟 1：創建 Google Apps Script 專案

1. 前往 [Google Apps Script](https://script.google.com/)
2. 點擊「新增專案」
3. 將 `../google-apps-script-complete.js` 的內容複製到編輯器中

## 📋 步驟 2：設置 Script Properties

1. 在 Google Apps Script 編輯器中，點擊左側的「專案設定」（Project Settings）
2. 滾動到「指令碼屬性」（Script Properties）
3. 點擊「新增指令碼屬性」
4. 添加以下屬性：

| 屬性名稱 | 屬性值 | 說明 |
|---------|--------|------|
| `GITHUB_TOKEN` | `你的GitHub Token` | 從 `config.json` 複製 |
| `GITHUB_REPO_OWNER` | `你的GitHub用戶名` | 從 `config.json` 複製 |
| `GITHUB_REPO_NAME` | `exit_league` | Repository 名稱 |
| `GITHUB_BRANCH` | `main` | 分支名稱 |

## 📋 步驟 3：部署為 Web App

1. 點擊右上角的「部署」→「新增部署作業」
2. 選擇類型：「網頁應用程式」
3. 設置：
   - **執行身份**：選擇「我」
   - **具有存取權的使用者**：選擇「所有人」
4. 點擊「部署」
5. **重要**：複製「網頁應用程式 URL」，這就是你的 `webAppUrl`

## 📋 步驟 4：更新 config.json

將複製的 Web App URL 填入 `config.json`：

```json
{
  "googleAppsScript": {
    "webAppUrl": "你複製的URL"
  }
}
```

## 📋 步驟 5：測試

1. 在 admin 系統中保存一場比賽
2. 檢查：
   - Google Sheets 是否成功保存
   - GitHub Repository 中是否出現新檔案
   - 檔案路徑是否正確

## 🔍 查看執行記錄

如果遇到問題，可以查看執行記錄：

1. 在 Google Apps Script 編輯器中
2. 點擊左側的「執行」（Executions）
3. 查看最近的執行記錄和錯誤訊息

## ⚠️ 注意事項

1. **首次部署後需要授權**
   - 第一次執行時，Google 會要求授權
   - 點擊「檢閱權限」→ 選擇你的 Google 帳號 → 「進階」→ 「前往 [專案名稱]（不安全）」

2. **更新代碼後需要重新部署**
   - 每次修改代碼後，需要點擊「部署」→「管理部署作業」→「編輯」→「新版本」→「部署」

3. **Script Properties 是安全的**
   - Script Properties 中的值不會暴露給前端
   - 只有 Google Apps Script 可以讀取

## 📚 相關文件

- `README.md` - 配置說明
- `../google-apps-script-complete.js` - 完整的 Google Apps Script 代碼
- `../GITHUB_SETUP.md` - GitHub API 設置詳細說明
