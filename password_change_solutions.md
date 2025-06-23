# 🔐 密碼變更 & 📄 GitHub自動部署 解決方案

## 🔐 問題1：使用者自行更改密碼

### 📋 **方案比較**

| 方案 | 優點 | 缺點 | 推薦度 |
|------|------|------|--------|
| Google Apps Script | 免費、簡單、整合性好 | 功能基礎、安全性一般 | ⭐⭐⭐⭐ |
| Firebase Auth | 專業、安全性高、功能完整 | 需要學習曲線、可能產生費用 | ⭐⭐⭐⭐⭐ |
| 簡易本地存儲 | 最簡單 | 安全性差、易丟失 | ⭐⭐ |

---

## 🚀 **方案A：Google Apps Script 實現**

### 📋 **GAS端程式碼**

```javascript
// Google Apps Script - doPost 函數
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        
        switch (action) {
            case 'changePassword':
                return changePassword(data);
            case 'login':
                return handleLogin(data);
            case 'saveGameData':
                return saveGameData(data);
            default:
                return ContentService
                    .createTextOutput(JSON.stringify({status: 'error', message: '未知操作'}))
                    .setMimeType(ContentService.MimeType.JSON);
        }
    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// 密碼變更功能
function changePassword(data) {
    const { username, oldPassword, newPassword } = data;
    
    // 開啟密碼表格 (建議建立專門的密碼管理表格)
    const sheet = SpreadsheetApp.openById('YOUR_PASSWORD_SHEET_ID').getActiveSheet();
    const values = sheet.getDataRange().getValues();
    
    // 尋找用戶
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[0] === username && row[1] === oldPassword) {
            // 驗證成功，更新密碼
            sheet.getRange(i + 1, 2).setValue(newPassword);
            
            // 記錄變更時間
            sheet.getRange(i + 1, 4).setValue(new Date());
            
            return ContentService
                .createTextOutput(JSON.stringify({
                    status: 'success', 
                    message: '密碼變更成功'
                }))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
    
    return ContentService
        .createTextOutput(JSON.stringify({
            status: 'error', 
            message: '原密碼錯誤'
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

// 登入驗證
function handleLogin(data) {
    const { username, password } = data;
    
    const sheet = SpreadsheetApp.openById('YOUR_PASSWORD_SHEET_ID').getActiveSheet();
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[0] === username && row[1] === password) {
            return ContentService
                .createTextOutput(JSON.stringify({
                    status: 'success',
                    userInfo: {
                        username: row[0],
                        teamName: row[2],
                        role: row[3] || 'team'
                    }
                }))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
    
    return ContentService
        .createTextOutput(JSON.stringify({
            status: 'error', 
            message: '帳號或密碼錯誤'
        }))
        .setMimeType(ContentService.MimeType.JSON);
}
```

### 📊 **Google Sheets 密碼表格結構**

```
A欄：帳號 | B欄：密碼 | C欄：隊伍名稱 | D欄：角色 | E欄：最後更新時間
exitA   | escape123| 逃生入口A   | team    | 2025/6/23 14:30
exitC   | escape456| 逃生入口C   | team    | 2025/6/20 10:15
jack    | jack789  | Jack       | team    | 2025/6/18 16:45
...
```

### 🖥️ **前端程式碼**

```javascript
// admin.html - 密碼變更功能
function showChangePasswordModal() {
    const modal = `
        <div class="password-modal" id="passwordModal">
            <div class="modal-content">
                <h3>變更密碼</h3>
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label>目前密碼：</label>
                        <input type="password" id="oldPassword" required>
                    </div>
                    <div class="form-group">
                        <label>新密碼：</label>
                        <input type="password" id="newPassword" required>
                    </div>
                    <div class="form-group">
                        <label>確認新密碼：</label>
                        <input type="password" id="confirmPassword" required>
                    </div>
                    <div class="modal-buttons">
                        <button type="submit">變更密碼</button>
                        <button type="button" onclick="closePasswordModal()">取消</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
    document.getElementById('passwordModal').style.display = 'block';
}

// 處理密碼變更
document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // 驗證新密碼
    if (newPassword !== confirmPassword) {
        alert('新密碼與確認密碼不符！');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('新密碼至少需要6個字元！');
        return;
    }
    
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        
        const response = await fetch(GAS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'changePassword',
                username: currentUser.username,
                oldPassword: oldPassword,
                newPassword: newPassword
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert('密碼變更成功！下次登入請使用新密碼。');
            closePasswordModal();
        } else {
            alert('密碼變更失敗：' + result.message);
        }
        
    } catch (error) {
        alert('網路錯誤，請稍後再試');
        console.error('密碼變更錯誤:', error);
    }
});
```

---

## 🚀 **方案B：Firebase Authentication (進階)**

### 📋 **Firebase 設定**

```javascript
// Firebase 配置
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';

const firebaseConfig = {
    // 你的 Firebase 配置
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 密碼變更
async function changePasswordFirebase(newPassword) {
    try {
        const user = auth.currentUser;
        await updatePassword(user, newPassword);
        return { success: true, message: '密碼變更成功' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}
```

---

## 📄 問題2：GitHub 自動部署

### 💡 **實現方案**

#### **方案A：GitHub API + Personal Access Token (推薦)**

```javascript
// GitHub API 文件寫入
async function saveToGitHub(fileName, htmlContent, gameData) {
    const GITHUB_CONFIG = {
        owner: 'your-username',
        repo: 'schedule',
        token: 'ghp_your_personal_access_token',
        branch: 'main'
    };
    
    try {
        const filePath = `game_result/season4/${fileName}`;
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
        
        // 檢查文件是否已存在
        let sha = null;
        try {
            const existingFile = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (existingFile.ok) {
                const existingData = await existingFile.json();
                sha = existingData.sha;
            }
        } catch (e) {
            // 文件不存在，這是正常的
        }
        
        // 編碼內容為 base64
        const encodedContent = btoa(unescape(encodeURIComponent(htmlContent)));
        
        // 準備提交數據
        const commitData = {
            message: `Auto-generated game result: ${gameData.gameId} (${gameData.awayTeam} vs ${gameData.homeTeam})`,
            content: encodedContent,
            branch: GITHUB_CONFIG.branch
        };
        
        if (sha) {
            commitData.sha = sha; // 更新現有文件
        }
        
        // 提交到 GitHub
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitData)
        });
        
        if (response.ok) {
            const result = await response.json();
            return {
                success: true,
                message: '文件已成功上傳到 GitHub',
                fileUrl: `https://your-username.github.io/schedule/${filePath}`,
                commitUrl: result.commit.html_url
            };
        } else {
            throw new Error(`GitHub API 錯誤: ${response.status}`);
        }
        
    } catch (error) {
        console.error('GitHub 上傳失敗:', error);
        return {
            success: false,
            message: '上傳到 GitHub 失敗: ' + error.message
        };
    }
}
```

#### **方案B：Google Apps Script + GitHub API**

```javascript
// GAS 版本的 GitHub 上傳
function uploadToGitHub(fileName, htmlContent, gameData) {
    const GITHUB_CONFIG = {
        owner: 'your-username',
        repo: 'schedule',
        token: 'ghp_your_personal_access_token'
    };
    
    const filePath = `game_result/season4/${fileName}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
    
    // 編碼內容
    const encodedContent = Utilities.base64Encode(htmlContent, Utilities.Charset.UTF_8);
    
    const payload = {
        message: `Auto-generated: ${gameData.gameId} result`,
        content: encodedContent,
        branch: 'main'
    };
    
    const options = {
        method: 'PUT',
        headers: {
            'Authorization': 'token ' + GITHUB_CONFIG.token,
            'Accept': 'application/vnd.github.v3+json'
        },
        payload: JSON.stringify(payload)
    };
    
    try {
        const response = UrlFetchApp.fetch(apiUrl, options);
        const result = JSON.parse(response.getContentText());
        
        if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
            return {
                success: true,
                message: '文件已上傳到 GitHub',
                fileUrl: `https://your-username.github.io/schedule/${filePath}`
            };
        } else {
            throw new Error('GitHub API 錯誤: ' + response.getResponseCode());
        }
    } catch (error) {
        return {
            success: false,
            message: 'GitHub 上傳失敗: ' + error.toString()
        };
    }
}
```

#### **方案C：GitHub Actions (最自動化)**

```yaml
# .github/workflows/auto-deploy.yml
name: Auto Deploy Game Results

on:
  repository_dispatch:
    types: [deploy-game-result]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Create game result file
        run: |
          echo "${{ github.event.client_payload.html_content }}" > "game_result/season4/${{ github.event.client_payload.filename }}"
      
      - name: Commit and push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "Auto-generated: ${{ github.event.client_payload.game_id }}"
          git push
```

### 🔧 **設定步驟**

#### **GitHub Personal Access Token 設定**

1. **GitHub 設定** → **Developer settings** → **Personal access tokens**
2. **Generate new token** → 選擇權限：
   - ✅ `repo` (完整 repository 權限)
   - ✅ `workflow` (如果要觸發 Actions)
3. **複製 token** (只會顯示一次！)

#### **前端整合**

```javascript
// 完整的保存流程
async function saveGameDataWithGitHub(gameData) {
    try {
        // 1. 保存到 Google Sheets
        const sheetsResult = await saveToGoogleSheets(gameData);
        
        if (sheetsResult.success) {
            // 2. 生成 HTML
            const htmlContent = generateGameResultHTML(gameData);
            const fileName = `g${gameData.gameId.replace('g', '')}.html`;
            
            // 3. 上傳到 GitHub
            const githubResult = await saveToGitHub(fileName, htmlContent, gameData);
            
            if (githubResult.success) {
                alert(`✅ 比賽資料已完成！\n\n📊 數據已保存到 Google Sheets\n📄 結果頁面已發布到 GitHub\n🌐 查看結果：${githubResult.fileUrl}`);
            } else {
                alert(`⚠️ 部分完成\n\n✅ 數據已保存\n❌ GitHub 上傳失敗：${githubResult.message}`);
            }
        }
        
    } catch (error) {
        alert('保存失敗：' + error.message);
    }
}
```

---

## 🎯 **推薦實施方案**

### 🔐 **密碼變更：Google Apps Script**
- ✅ **成本**：免費
- ✅ **整合性**：與現有系統完美整合
- ✅ **學習成本**：低
- ⚠️ **安全性**：中等（適合內部使用）

### 📄 **GitHub 部署：GitHub API + Personal Access Token**
- ✅ **自動化程度**：高
- ✅ **即時性**：立即發布
- ✅ **可靠性**：GitHub API 穩定
- ⚠️ **設定複雜度**：中等

---

## 📋 **實施檢查清單**

### 🔐 **密碼變更功能**
- [ ] 建立 Google Sheets 密碼管理表
- [ ] 部署 GAS 密碼變更功能
- [ ] 前端增加密碼變更界面
- [ ] 測試密碼變更流程

### 📄 **GitHub 自動部署**
- [ ] 建立 GitHub Personal Access Token
- [ ] 實現 GitHub API 上傳功能
- [ ] 測試文件自動上傳
- [ ] 驗證 GitHub Pages 自動更新

### 🔗 **整合測試**
- [ ] 端到端流程測試
- [ ] 錯誤處理測試
- [ ] 權限邊界測試
- [ ] 性能測試

---

## ⚡ **快速啟動建議**

1. **第1天**：設定 GitHub Token 和基礎 API 功能
2. **第2天**：實現密碼變更功能
3. **第3天**：整合測試和優化
4. **第4天**：部署和用戶培訓

---

*總預估時間：2-3天*
*技術難度：⭐⭐⭐ (中等)* 