# GitHub 自動更新設置檢查清單

使用此檢查清單確保所有配置都正確完成。

## ✅ GitHub 配置

- [ ] 已創建 GitHub Personal Access Token
- [ ] Token 權限包含 `repo`（完整權限）
- [ ] 已將 Token 填入 `config.json` 的 `github.token`
- [ ] 已填入 GitHub 用戶名到 `config.json` 的 `github.repoOwner`
- [ ] 已確認 Repository 名稱正確（`github.repoName`）
- [ ] 已確認分支名稱正確（`github.branch`，通常是 `main`）

## ✅ Google Apps Script 配置

- [ ] 已創建 Google Apps Script 專案
- [ ] 已複製 `google-apps-script-complete.js` 的內容到專案
- [ ] 已設置 Script Properties：
  - [ ] `GITHUB_TOKEN`
  - [ ] `GITHUB_REPO_OWNER`
  - [ ] `GITHUB_REPO_NAME`
  - [ ] `GITHUB_BRANCH`
- [ ] 已部署為 Web App
- [ ] 已複製 Web App URL
- [ ] 已將 Web App URL 填入 `config.json` 的 `googleAppsScript.webAppUrl`
- [ ] 已授權 Google Apps Script 存取權限

## ✅ 路徑配置

- [ ] 已確認 `paths.basePath` 正確
- [ ] 已確認 `paths.seasonMapping` 包含所有需要的賽季

## ✅ 安全檢查

- [ ] `config.json` 已加入 `.gitignore`
- [ ] `config.example.json` 已提交到 Git（不包含敏感資訊）
- [ ] GitHub Token 沒有在前端代碼中硬編碼
- [ ] 已確認 Token 權限最小化（只需要 `repo`）

## ✅ 測試

- [ ] 在 admin 系統中保存一場測試比賽
- [ ] 檢查 Google Sheets 是否成功保存
- [ ] 檢查 GitHub Repository 中是否出現新檔案
- [ ] 檢查檔案路徑是否正確
- [ ] 檢查檔案內容是否正確（與 g89.html 格式一致）
- [ ] 檢查 Google Apps Script 執行記錄是否有錯誤

## 📝 測試記錄

記錄測試結果：

- **測試日期**：___________
- **測試比賽ID**：___________
- **Google Sheets 保存**：✅ / ❌
- **GitHub 上傳**：✅ / ❌
- **檔案路徑**：___________
- **備註**：___________

## 🆘 如果測試失敗

1. 檢查 Google Apps Script 執行記錄
2. 檢查瀏覽器 Console 錯誤訊息
3. 檢查 GitHub API 回應狀態碼
4. 確認所有配置都正確填入
5. 確認 Token 權限足夠

## 📞 需要幫助？

參考以下文件：
- `README.md` - 配置說明
- `SETUP_GAS.md` - Google Apps Script 設置指南
- `../GITHUB_SETUP.md` - GitHub API 設置詳細說明
