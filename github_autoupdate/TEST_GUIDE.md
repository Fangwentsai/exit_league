# Google Apps Script 測試指南

## 🚀 快速測試步驟

### 步驟 1：設置 Script Properties（必須先完成）

1. 在 Google Apps Script 編輯器中
2. 點擊左側的「**專案設定**」（Project Settings）
3. 滾動到「**指令碼屬性**」（Script Properties）
4. 點擊「**新增指令碼屬性**」，添加以下 4 個屬性：

| 屬性名稱 | 屬性值 | 從哪裡複製 |
|---------|--------|-----------|
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `github_autoupdate/config.json`（請使用實際 token） |
| `GITHUB_REPO_OWNER` | `Fangwentsai` | `github_autoupdate/config.json` |
| `GITHUB_REPO_NAME` | `exit_league` | `github_autoupdate/config.json` |
| `GITHUB_BRANCH` | `main` | `github_autoupdate/config.json` |

### 步驟 2：測試 Script Properties 是否設置正確

1. 在 Google Apps Script 編輯器中
2. 選擇函數：`checkScriptProperties`
3. 點擊「**執行**」（Run）按鈕
4. 點擊「**檢視**」→「**記錄**」（View → Logs）
5. 查看記錄，應該看到：
   ```
   GITHUB_TOKEN: ✅ 已設置
   GITHUB_REPO_OWNER: Fangwentsai
   GITHUB_REPO_NAME: exit_league
   GITHUB_BRANCH: main
   ```

### 步驟 3：測試 GitHub 上傳功能

1. 在 Google Apps Script 編輯器中
2. 選擇函數：`testGitHubUpload`
3. 點擊「**執行**」（Run）按鈕
4. 如果是第一次執行，會要求授權：
   - 點擊「**檢閱權限**」
   - 選擇你的 Google 帳號
   - 點擊「**進階**」
   - 點擊「**前往 [專案名稱]（不安全）**」
5. 查看執行記錄：
   - 點擊「**檢視**」→「**記錄**」（View → Logs）
   - 應該看到：
     ```
     🚀 開始上傳文件到 GitHub...
     ✅ 文件上傳成功
     📄 文件 URL: https://github.com/...
     ```
6. 檢查 GitHub Repository：
   - 前往 https://github.com/Fangwentsai/exit_league
   - 檢查 `game_result/season6/test.html` 是否存在

### 步驟 4：測試完整流程（使用測試頁面）

1. 打開 `github_autoupdate/test-upload-to-season6.html`
2. 選擇 `config.json` 檔案
3. 設置測試比賽 ID（例如：`test-g90`）
4. 點擊「**測試完整上傳流程**」
5. 查看結果：
   - Google Sheets 是否保存成功
   - GitHub 是否上傳成功
   - 文件路徑是否正確

### 步驟 5：測試實際 Admin 系統

1. 打開 admin 系統頁面
2. 選擇一場比賽
3. 填寫比賽資料
4. 點擊「**保存比賽**」
5. 檢查：
   - Google Sheets 是否出現新工作表
   - GitHub Repository 中是否出現新檔案
   - 檔案路徑：`game_result/season6/{gameId}.html`

## 🔍 查看執行記錄

### 方法 1：在 Google Apps Script 中查看

1. 在 Google Apps Script 編輯器中
2. 點擊左側的「**執行**」（Executions）
3. 查看最近的執行記錄
4. 點擊記錄查看詳細日誌

### 方法 2：查看即時日誌

1. 在 Google Apps Script 編輯器中
2. 點擊「**檢視**」→「**記錄**」（View → Logs）
3. 執行測試函數
4. 日誌會即時顯示

## 🐛 常見問題排查

### Q: 執行時出現「需要授權」？

**A:** 
1. 點擊「**檢閱權限**」
2. 選擇你的 Google 帳號
3. 點擊「**進階**」→「**前往 [專案名稱]（不安全）**」
4. 授權後重新執行

### Q: GitHub 上傳失敗，錯誤 401？

**A:** 
- Token 無效或過期
- 檢查 Script Properties 中的 `GITHUB_TOKEN` 是否正確
- 前往 [GitHub Settings → Tokens](https://github.com/settings/tokens) 重新生成 Token

### Q: GitHub 上傳失敗，錯誤 403？

**A:** 
- Token 權限不足
- 確認 Token 有 `repo` 權限
- 重新生成 Token 並設置 `repo` 權限

### Q: GitHub 上傳失敗，錯誤 404？

**A:** 
- Repository 不存在或路徑錯誤
- 檢查 Script Properties：
  - `GITHUB_REPO_OWNER` 是否為 `Fangwentsai`
  - `GITHUB_REPO_NAME` 是否為 `exit_league`
  - `GITHUB_BRANCH` 是否為 `main`

### Q: Google Sheets 保存失敗？

**A:** 
- 檢查試算表 ID 是否正確：`1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE`
- 確認 Google Apps Script 有權限存取該試算表
- 檢查執行記錄中的錯誤訊息

## ✅ 測試檢查清單

- [ ] Script Properties 已設置（4 個屬性）
- [ ] `checkScriptProperties()` 測試通過
- [ ] `testGitHubUpload()` 測試通過
- [ ] GitHub Repository 中出現測試文件
- [ ] 測試頁面測試通過
- [ ] Admin 系統實際保存測試通過

## 📚 相關文件

- `SETUP_GAS.md` - Google Apps Script 設置指南
- `GAS_GITHUB_SETUP.md` - GitHub API 設置說明
- `README.md` - 配置說明
- `CHECKLIST.md` - 設置檢查清單
