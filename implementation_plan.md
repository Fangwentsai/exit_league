# 🚀 難找的聯賽 - 功能實現計劃

## 🔐 功能1：權限控管系統

### 💡 **實現難度：⭐⭐⭐ (中等)**

### 📋 **需要的文件修改**

#### 1. **創建帳號配置文件**
```javascript
// config/team_accounts.js
const TEAM_ACCOUNTS = {
    "逃生入口A": { 
        username: "exitA", 
        password: "escape123", 
        role: "team",
        displayName: "逃生入口A"
    },
    "逃生入口C": { 
        username: "exitC", 
        password: "escape456", 
        role: "team",
        displayName: "逃生入口C"
    },
    "Jack": { 
        username: "jack", 
        password: "jack789", 
        role: "team",
        displayName: "Jack"
    },
    "人生揪難": { 
        username: "lifebar", 
        password: "life101", 
        role: "team",
        displayName: "人生揪難"
    },
    "海盜揪硬": { 
        username: "pirate", 
        password: "pirate102", 
        role: "team",
        displayName: "海盜揪硬"
    },
    "Vivi朝酒晚舞": { 
        username: "vivi", 
        password: "vivi103", 
        role: "team",
        displayName: "Vivi朝酒晚舞"
    },
    "一鏢開天門": { 
        username: "oneshot", 
        password: "shot104", 
        role: "team",
        displayName: "一鏢開天門"
    },
    "酒空組": { 
        username: "airdrink", 
        password: "air105", 
        role: "team",
        displayName: "酒空組"
    },
    "root": { 
        username: "root", 
        password: "root666", 
        role: "admin",
        displayName: "系統管理員"
    }
};
```

#### 2. **修改 admin.html 登入系統**
```javascript
// 新的登入處理
function handleLogin(username, password) {
    // 查找帳號
    const account = Object.values(TEAM_ACCOUNTS).find(acc => 
        acc.username === username && acc.password === password
    );
    
    if (account) {
        // 存儲登入資訊
        sessionStorage.setItem('currentUser', JSON.stringify({
            username: account.username,
            role: account.role,
            teamName: account.displayName
        }));
        
        // 根據角色載入不同介面
        if (account.role === 'admin') {
            loadAdminInterface();
        } else {
            loadTeamInterface(account.displayName);
        }
    } else {
        showError('帳號或密碼錯誤');
    }
}
```

#### 3. **比賽權限過濾**
```javascript
// 根據登入角色過濾可見比賽
function filterGamesByPermission(allGames, currentUser) {
    if (currentUser.role === 'admin') {
        return allGames; // 管理員看到所有比賽
    }
    
    // 隊伍只能看到自己參與的比賽
    return allGames.filter(game => 
        game.home === currentUser.teamName || 
        game.away === currentUser.teamName
    );
}

// 檢查特定操作權限
function checkGamePermission(gameData, currentUser, action) {
    const isHomeTeam = gameData.home === currentUser.teamName;
    const isAwayTeam = gameData.away === currentUser.teamName;
    
    switch (action) {
        case 'edit':
            return currentUser.role === 'admin' || isHomeTeam;
        case 'approve':
            return isAwayTeam;
        case 'view':
            return currentUser.role === 'admin' || isHomeTeam || isAwayTeam;
        default:
            return false;
    }
}
```

#### 4. **UI權限控制**
```javascript
// 根據權限調整介面
function setupGameInterface(gameData, currentUser) {
    const isHomeTeam = gameData.home === currentUser.teamName;
    const isAwayTeam = gameData.away === currentUser.teamName;
    const isAdmin = currentUser.role === 'admin';
    
    if (isAdmin || isHomeTeam) {
        // 主隊或管理員：完整編輯權限
        enableEditMode();
        showSaveButton();
    } else if (isAwayTeam) {
        // 客隊：唯讀模式 + 確認按鈕
        enableReadOnlyMode();
        showApprovalButton();
    } else {
        // 無權限
        showNoPermissionMessage();
    }
}
```

### 🎨 **需要的UI改動**

1. **登入頁面增強**：
   - 隊伍選擇下拉選單
   - 更清楚的角色說明

2. **主頁面狀態顯示**：
   - 當前登入身份
   - 權限範圍說明
   - 登出按鈕

3. **客隊確認介面**：
   - 唯讀的比賽資料顯示
   - 明顯的「確認比賽結果」按鈕
   - 確認狀態顯示

---

## 📄 功能2：自動生成比賽結果頁面

### 💡 **實現難度：⭐⭐ (簡單到中等)**

### 📋 **需要的準備工作**

#### 1. **分析現有模板結構**

從 `game_result/season4/g01.html` 分析，需要以下數據：

```javascript
// 比賽基本資訊
const gameInfo = {
    date: "2025/6/24 21:00",
    venue: "Jack Bar", // 根據主場隊伍決定
    gameCode: "g45",
    awayTeam: "逃生入口A",
    homeTeam: "逃生入口C",
    awayScore: 8,
    homeScore: 15
};

// 比賽詳細數據
const matchData = [
    {set: 1, type: '01', away: 'Ace', home: '阿達', firstAttack: 'home', winner: 'away'},
    {set: 2, type: '01', away: '小倫', home: '阿國', firstAttack: 'away', winner: 'home'},
    // ... 其他15個SET
];

// 飲酒加成
const drinkingBonus = {
    away: 0,
    home: 5
};
```

#### 2. **創建模板生成器**

```javascript
// 自動生成HTML模板
function generateGameResultHTML(gameData) {
    const template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="../../styles/common/game_result.css">
</head>
<body>
    <div class="container">
        <!-- 比賽資訊區 -->
        <div class="match-info">
            <h2 class="match-date">${gameData.date}</h2>
            <div class="venue-info">${gameData.venue}</div>
            <div class="match-result">
                <div class="team away">
                    <div class="team-name">${gameData.awayTeam}</div>
                    <div class="team-score">${gameData.awayScore}</div>
                </div>
                <div class="score-divider">:</div>
                <div class="team home">
                    <div class="team-score">${gameData.homeScore}</div>
                    <div class="team-name">${gameData.homeTeam}</div>
                </div>
            </div>
        </div>

        <div class="games-container">
            ${generateGameSections(gameData.matches)}
            ${generatePlayerStats(gameData.players)}
        </div>
    </div>

    <script src="../../js/game_result.js"></script>
    <script>
        ${generateJavaScriptData(gameData)}
    </script>
</body>
</html>`;
    
    return template;
}
```

#### 3. **SET分組生成器**

```javascript
// 生成各個賽局區塊
function generateGameSections(matches) {
    return `
        <!-- 個人賽 01 -->
        <div class="game-section">
            <h3>個人賽 01</h3><h4>(黃底為先攻場次)</h4>
            <table class="game-table">
                <tr><th>賽局</th><th>客隊</th><th>主隊</th></tr>
                ${generateSetRows(matches, [1,2,3,4,5], 'individual')}
            </table>
        </div>

        <!-- Cricket 賽局 -->
        <div class="game-section">
            <h3>Cricket Games</h3>
            <table class="game-table">
                <tr><th>賽局</th><th>客隊</th><th>主隊</th></tr>
                ${generateSetRows(matches, [6,7,8,9,10], 'cricket')}
            </table>
        </div>

        <!-- 雙人賽 -->
        <div class="game-section">
            <h3>雙人賽</h3>
            <table class="game-table">
                <tr><th>賽局</th><th>客隊</th><th>主隊</th></tr>
                ${generateSetRows(matches, [11,12,13,14], 'doubles')}
            </table>
        </div>

        <!-- 四人賽 -->
        <div class="game-section">
            <h3>四人賽</h3>
            <table class="game-table">
                <tr><th>賽局</th><th>客隊</th><th>主隊</th></tr>
                ${generateSetRows(matches, [15,16], 'team')}
            </table>
        </div>
    `;
}
```

#### 4. **文件寫入功能**

```javascript
// 生成並保存文件
async function generateAndSaveGameResult(adminGameData) {
    try {
        // 轉換admin格式到game_result格式
        const gameResultData = convertAdminToGameResult(adminGameData);
        
        // 生成HTML內容
        const htmlContent = generateGameResultHTML(gameResultData);
        
        // 確定文件名
        const fileName = `g${adminGameData.gameId.replace('g', '')}.html`;
        const filePath = `game_result/season4/${fileName}`;
        
        // 保存文件 (需要伺服器端支援)
        await saveGameResultFile(filePath, htmlContent);
        
        // 更新主頁的比賽連結
        await updateMainPageLinks(adminGameData.gameId);
        
        return {
            success: true,
            fileName: fileName,
            path: filePath
        };
        
    } catch (error) {
        console.error('生成比賽結果頁面失敗:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

### 🛠️ **實現步驟**

#### Phase 1: 權限系統 (預估 1-2 天)
1. ✅ 創建帳號配置文件
2. ✅ 修改登入系統
3. ✅ 實現權限過濾
4. ✅ 調整UI權限控制

#### Phase 2: 結果頁面生成 (預估 2-3 天)
1. ✅ 分析並抽象化模板結構
2. ✅ 創建數據轉換器
3. ✅ 實現HTML生成器
4. ✅ 測試並優化

#### Phase 3: 整合測試 (預估 1 天)
1. ✅ 端到端流程測試
2. ✅ 權限邊界測試
3. ✅ 文件生成測試
4. ✅ 錯誤處理測試

### 🎯 **技術難點解決方案**

#### 1. **文件寫入權限**
- **問題**：瀏覽器無法直接寫入本地文件
- **解決方案**：
  - 使用 Google Apps Script 作為中介
  - 或設置簡單的 Node.js 後端服務
  - 或用戶手動下載生成的HTML文件

#### 2. **數據格式轉換**
- **問題**：admin系統和game_result系統的數據結構不同
- **解決方案**：創建專門的轉換函數

#### 3. **模板維護**
- **問題**：模板變更時需要同步更新
- **解決方案**：將模板抽象化為可配置的組件

### 💾 **數據流程**

```
Admin系統數據 
    ↓ (客隊確認後)
格式轉換器
    ↓
HTML模板生成器
    ↓
文件保存服務
    ↓
game_result/season4/gXX.html
```

---

## 🎉 **預期效果**

### 🔐 **權限控管效果**
- ✅ 8支隊伍各有專屬帳號
- ✅ 只能看到自己參與的比賽
- ✅ 主隊有編輯權，客隊有確認權
- ✅ 防止未授權訪問

### 📄 **自動生成效果**
- ✅ 客隊確認後一鍵生成比賽結果頁面
- ✅ 格式與現有頁面完全一致
- ✅ 自動計算選手統計數據
- ✅ 無需手動編寫HTML

### 🚀 **整體提升**
- ✅ 工作流程自動化
- ✅ 減少人工錯誤
- ✅ 提高數據一致性
- ✅ 增強用戶體驗

---

## 🛡️ **風險評估**

### ⚠️ **潛在風險**
1. **文件寫入限制**：需要額外的後端支援
2. **權限繞過**：需要仔細設計前端安全機制
3. **數據同步**：確保各系統間數據一致性

### 🔧 **緩解措施**
1. **提供多種文件保存方案**（雲端/本地/下載）
2. **多層權限驗證**（前端+後端）
3. **完整的測試覆蓋**

---

## 📅 **建議實施順序**

1. **第1週**：實現權限控管系統
2. **第2週**：開發自動生成功能
3. **第3週**：整合測試和優化
4. **第4週**：用戶培訓和上線

---

*最後更新：2025年6月*
*預估總工時：40-60小時* 