# GitHub 自動更新配置說明

此資料夾包含 GitHub API 自動上傳功能所需的配置檔案。

## 📋 配置步驟

### 1. 複製配置範例檔案

```bash
cp config.example.json config.json
```

### 2. 編輯 `config.json` 填入你的資訊

打開 `config.json` 檔案，填入以下資訊：

#### GitHub 配置

- **`github.token`**: GitHub Personal Access Token
  - 前往 [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
  - 點擊「Generate new token (classic)」
  - 設置權限：✅ `repo` (完整權限)
  - 生成並複製 Token（只會顯示一次）

- **`github.repoOwner`**: 你的 GitHub 用戶名或組織名
  - 例如：`your-username` 或 `your-org`

- **`github.repoName`**: Repository 名稱
  - 預設：`exit_league`
  - 如果不同請修改

- **`github.branch`**: 分支名稱
  - 預設：`main`
  - 如果使用其他分支請修改

#### Google Apps Script 配置

- **`googleAppsScript.webAppUrl`**: Google Apps Script Web App URL
  - 如果已經有部署的 Web App，填入 URL
  - 如果還沒有，請參考 `SETUP_GAS.md` 進行設置

#### 路徑配置

- **`paths.basePath`**: 預設基礎路徑
  - 預設：`game_result/season6`
  - 比賽結果 HTML 檔案會保存在此路徑下

- **`paths.seasonMapping`**: 賽季路徑映射
  - 可以根據不同賽季設置不同的路徑
  - 目前支援 `season5` 和 `season6`

## 🔧 使用方式

### 方式一：在 Google Apps Script 中使用（推薦）

1. 打開你的 Google Apps Script 專案
2. 點擊「專案設定」（Project Settings）
3. 在「指令碼屬性」（Script Properties）中添加：
   - `GITHUB_TOKEN`: 你的 GitHub Token
   - `GITHUB_REPO_OWNER`: 你的 GitHub 用戶名
   - `GITHUB_REPO_NAME`: Repository 名稱（例如 `exit_league`）
   - `GITHUB_BRANCH`: 分支名稱（例如 `main`）

### 方式二：在前端使用（僅供測試，不推薦）

⚠️ **注意**：不建議在前端直接使用 GitHub Token，因為會暴露在客戶端。

如果只是測試，可以在 `js/github-api.js` 中設置：

```javascript
const GITHUB_CONFIG = {
    REPO_OWNER: 'your-username',
    REPO_NAME: 'exit_league',
    BRANCH: 'main',
    BASE_PATH: 'game_result/season6',
};
```

## 📝 配置範例

### 完整的 `config.json` 範例

```json
{
  "github": {
    "token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "repoOwner": "your-username",
    "repoName": "exit_league",
    "branch": "main"
  },
  "googleAppsScript": {
    "webAppUrl": "https://script.google.com/macros/s/AKfycbw96zr198osWO2HIeFbKMaHaM3-WqkHcDJ1F_OmTJdulf3Euv2E9K7LrdRpMORMr5lW/exec"
  },
  "paths": {
    "basePath": "game_result/season6",
    "seasonMapping": {
      "season5": "game_result/season5",
      "season6": "game_result/season6"
    }
  }
}
```

## 🔒 安全注意事項

1. **不要將 `config.json` 提交到 Git**
   - 確保 `.gitignore` 中包含 `config.json`
   - 只提交 `config.example.json` 作為範例

2. **GitHub Token 安全**
   - Token 應該保存在後端（Google Apps Script）
   - 不要在前端代碼中硬編碼 Token
   - 如果 Token 洩露，立即撤銷並重新生成

3. **權限設置**
   - GitHub Token 只需要 `repo` 權限
   - 不要給予過多權限

## ✅ 驗證配置

配置完成後，可以：

1. 在 admin 系統中保存一場比賽
2. 檢查 Google Sheets 是否成功保存
3. 檢查 GitHub Repository 中是否出現新檔案
4. 查看檔案路徑是否正確（例如：`game_result/season6/g89.html`）

## 📚 相關文件

- `../GAS_SETUP_GUIDE.md` - Google Apps Script 設置指南
- `../GITHUB_SETUP.md` - GitHub API 設置詳細說明
- `../google-apps-script-complete.js` - 完整的 Google Apps Script 代碼

## 🆘 常見問題

### Q: Token 無效怎麼辦？
A: 檢查 Token 是否過期或被撤銷，重新生成一個新的 Token。

### Q: 上傳失敗怎麼辦？
A: 
1. 檢查 Token 權限是否足夠（需要 `repo` 權限）
2. 檢查 Repository 名稱和用戶名是否正確
3. 檢查分支名稱是否正確
4. 查看 Google Apps Script 的執行記錄（Logs）

### Q: 檔案路徑錯誤怎麼辦？
A: 檢查 `paths.basePath` 和 `paths.seasonMapping` 設置是否正確。

## 📞 需要幫助？

如果遇到問題，請檢查：
1. Google Apps Script 執行記錄
2. 瀏覽器 Console 錯誤訊息
3. GitHub API 回應狀態碼
