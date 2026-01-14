# 如何獲取配置資訊

本文檔說明如何獲取 `config.json` 中各項配置的值。

## 📋 配置項說明

### 1. `github.token` - GitHub Personal Access Token

**這是什麼？**
- GitHub 用來驗證你身份的 Token
- 類似密碼，但可以設定權限和過期時間

**如何獲取？**

1. 前往 GitHub 設定頁面：
   ```
   https://github.com/settings/tokens
   ```
   或
   - 登入 GitHub
   - 點擊右上角頭像 → **Settings**
   - 左側選單 → **Developer settings**
   - 點擊 **Personal access tokens** → **Tokens (classic)**

2. 生成新 Token：
   - 點擊 **Generate new token** → **Generate new token (classic)**
   - 填寫資訊：
     - **Note**（備註）：例如「Exit League Auto Update」
     - **Expiration**（過期時間）：選擇合適的時間（建議 90 天或更長）
     - **Select scopes**（選擇權限）：
       - ✅ **repo** - 完整權限（包含讀寫 Repository）

3. 點擊 **Generate token**

4. **重要**：複製 Token（只會顯示一次！）
   - Token 格式類似：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - 如果忘記了，需要重新生成

5. 填入 `config.json`：
   ```json
   "token": "ghp_你的token在這裡"
   ```

---

### 2. `github.repoOwner` - GitHub 用戶名或組織名

**這是什麼？**
- 你的 GitHub 用戶名
- 或你擁有的組織名稱

**如何查看？**

**方法 1：從 GitHub URL 查看**
1. 前往你的 GitHub 首頁
2. 查看瀏覽器網址列
3. URL 格式：`https://github.com/{你的用戶名}`
   - 例如：`https://github.com/jessetsai_mba`
   - 那麼 `repoOwner` 就是 `jessetsai_mba`

**方法 2：從 Repository URL 查看**
1. 前往你的 Repository 頁面
2. 查看 URL：`https://github.com/{用戶名}/{repository名稱}`
   - 例如：`https://github.com/jessetsai_mba/exit_league`
   - 那麼 `repoOwner` 就是 `jessetsai_mba`

**方法 3：從 GitHub 設定查看**
1. 登入 GitHub
2. 點擊右上角頭像 → **Settings**
3. 在頁面最上方可以看到你的用戶名

**填入 `config.json`：**
```json
"repoOwner": "你的GitHub用戶名"
```

---

### 3. `github.repoName` - Repository 名稱

**這是什麼？**
- 你的 Repository（專案）名稱

**如何查看？**

1. 前往你的 Repository 頁面
2. 查看 URL 或頁面標題
3. URL 格式：`https://github.com/{用戶名}/{repository名稱}`
   - 例如：`https://github.com/jessetsai_mba/exit_league`
   - 那麼 `repoName` 就是 `exit_league`

**填入 `config.json`：**
```json
"repoName": "exit_league"
```

**注意**：如果 Repository 名稱不同，請修改為實際名稱。

---

### 4. `github.branch` - 分支名稱

**這是什麼？**
- Git 分支名稱
- 通常是 `main` 或 `master`

**如何查看？**

**方法 1：從 GitHub 頁面查看**
1. 前往你的 Repository 頁面
2. 查看左上角的分支選擇器
3. 預設分支通常會顯示為 `main` 或 `master`

**方法 2：從 URL 查看**
- 如果 URL 包含分支名稱：`https://github.com/{用戶名}/{repo}/tree/{分支名}`
- 例如：`https://github.com/jessetsai_mba/exit_league/tree/main`
- 那麼 `branch` 就是 `main`

**方法 3：使用 Git 命令**
```bash
cd /Users/jessetsai_mba/Cursor/exit_league
git branch
# 會顯示所有分支，前面有 * 的是當前分支
```

**填入 `config.json`：**
```json
"branch": "main"
```

**注意**：
- 新專案通常使用 `main`
- 舊專案可能使用 `master`
- 如果不確定，預設使用 `main`

---

## ✅ 完整範例

假設你的資訊是：
- GitHub 用戶名：`jessetsai_mba`
- Repository 名稱：`exit_league`
- 分支名稱：`main`
- Token：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

那麼 `config.json` 應該是：

```json
{
  "github": {
    "token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "repoOwner": "jessetsai_mba",
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

---

## 🔍 快速檢查清單

- [ ] `github.token` - 已從 GitHub Settings → Tokens 獲取
- [ ] `github.repoOwner` - 已確認 GitHub 用戶名
- [ ] `github.repoName` - 已確認 Repository 名稱（預設：`exit_league`）
- [ ] `github.branch` - 已確認分支名稱（預設：`main`）

---

## 🆘 常見問題

### Q: Token 在哪裡看？
A: 
1. 前往 https://github.com/settings/tokens
2. 如果已經生成過，會看到 Token 列表
3. 但 Token 值只會在生成時顯示一次
4. 如果忘記了，需要重新生成

### Q: 如何確認 Repository 名稱？
A: 
1. 打開你的 Repository 頁面
2. 查看 URL 的最後一部分
3. 或查看頁面標題

### Q: 如何確認分支名稱？
A: 
1. 在 Repository 頁面左上角查看分支選擇器
2. 或使用 `git branch` 命令

### Q: Token 權限不夠怎麼辦？
A: 
1. 前往 Token 設定頁面
2. 點擊 Token 旁邊的編輯按鈕
3. 確保勾選了 `repo` 權限
4. 如果沒有，需要重新生成 Token

---

## 📚 相關連結

- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [GitHub Settings](https://github.com/settings/profile)
- [GitHub Repository](https://github.com/jessetsai_mba/exit_league)（替換為你的 Repository）
