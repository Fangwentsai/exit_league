/**
 * Admin 主要業務邏輯
 * 包含登入、比賽管理、資料處理等核心功能
 */

// ===== 全域變數 =====
let currentGame = null;
let currentSet = null;
let currentTeam = null;
let currentControlType = null; // 當前控制類型（firstAttack/winLose）
let playersData = {};
let selectedPlayers = {}; // 用於追蹤選手選擇
let firstAttackData = {}; // 用於追蹤先攻選擇
let winLoseData = {}; // 用於追蹤勝負選擇
let bonusTeam = null; // 用於追蹤飲酒加成
let hasUnsavedChanges = false; // 追蹤是否有未保存的變更

// SET類型定義
const setTypes = {
    1: "501 (OI/MO)",
    2: "501 (DI/DO)", 
    3: "701 (OI/MO)",
    4: "701 (OI/MO, 25/50)",
    5: "三人賽 701",
    6: "Cricket",
    7: "Cricket",
    8: "HALF-IT",
    9: "HALF-IT", 
    10: "三人賽 Cricket",
    11: "701 雙人賽",
    12: "701 雙人賽 FREEZE",
    13: "Cricket 雙人賽",
    14: "Team Cricket",
    15: "四人賽 1101",
    16: "四人賽 Cricket"
};

// SET選手數量定義
const setPlayerCounts = {
    1: 1, 2: 1, 3: 1, 4: 1,     // SET1-4: 單人賽
    5: 3,                        // SET5: 三人賽 701
    6: 1, 7: 1, 8: 1, 9: 1,     // SET6-9: 單人Cricket
    10: 3,                       // SET10: 三人賽 Cricket
    11: 2, 12: 2,               // SET11-12: 雙人賽 501
    13: 2, 14: 2,               // SET13-14: 雙人賽 Cricket
    15: 4, 16: 4                // SET15-16: 四人賽
};

// SET分數定義
const setScores = {
    1: 1, 2: 1, 3: 1, 4: 1,     // SET1-4: 1分（單人賽）
    5: 3,                        // SET5: 3分（三人賽 701）
    6: 1, 7: 1, 8: 1, 9: 1,     // SET6-9: 1分（單人Cricket）
    10: 3,                       // SET10: 3分（三人賽 Cricket）
    11: 2, 12: 2,               // SET11-12: 2分（雙人賽）
    13: 2, 14: 2,               // SET13-14: 2分（雙人賽 Cricket）
    15: 4, 16: 4                // SET15-16: 4分（四人賽）
};

// 移除舊的 noRepeatGroups 定義，使用新版本

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin 系統初始化...');
    
    // 添加彈窗監控
    console.log('🔍 [DEBUG] 開始監控彈窗狀態...');
    const playerModal = document.getElementById('playerModal');
    if (playerModal) {
        console.log('🎭 找到選手彈窗元素');
        
        // 檢查初始狀態
        const initialDisplay = window.getComputedStyle(playerModal).display;
        const initialStyleDisplay = playerModal.style.display;
        console.log('🎭 [DEBUG] 彈窗初始狀態:', {
            computedDisplay: initialDisplay,
            styleDisplay: initialStyleDisplay,
            className: playerModal.className,
            id: playerModal.id
        });
        
        // 如果初始狀態不是 none，強制隱藏
        if (initialDisplay !== 'none' && initialStyleDisplay !== 'none') {
            console.log('⚠️ [WARNING] 彈窗初始狀態不是隱藏，強制隱藏！');
            playerModal.style.display = 'none';
        }
        
        // 移除調試用的 MutationObserver
    } else {
        console.log('❌ 找不到選手彈窗元素');
    }
    
    // 初始化登入表單
    initializeLogin();
    
    // 載入選手資料
    loadPlayers();
    
    // 設置全域錯誤處理
    window.addEventListener('error', function(e) {
        console.error('🔥 JavaScript 錯誤:', e.error);
    });
    
    // 移除調試用的全域點擊監聽器
    
    console.log('✅ Admin 系統初始化完成');
});

// ===== 登入系統 =====
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // 簡單的驗證邏輯
        if (username === 'root' && password === 'root666') {
            showAdminDashboard();
        } else {
            showLoginError('帳號或密碼錯誤！');
        }
    });
}

function showLoginError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showAdminDashboard() {
    document.body.className = 'admin-mode';
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    // 載入比賽資料
    if (typeof window.SheetsAPI !== 'undefined') {
        window.SheetsAPI.loadGames();
    } else {
        console.error('❌ SheetsAPI 模組未載入');
    }
}

function logout() {
    if (hasAnyData() && hasUnsavedChanges) {
        if (!confirm('您有未保存的比賽資料，確定要登出嗎？')) {
            return;
        }
    }
    
    document.body.className = 'login-mode';
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    
    // 清空表單
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    // 重置所有資料
    resetAllData();
}

// ===== 資料管理 =====
function resetAllData() {
    selectedPlayers = {};
    firstAttackData = {};
    winLoseData = {};
    bonusTeam = null;
    hasUnsavedChanges = false;
    
    document.getElementById('gameDetails').style.display = 'none';
}

function resetGameSelection() {
    currentGame = null;
    resetAllData();
}

function hasAnyData() {
    // 檢查選手選擇
    for (let key in selectedPlayers) {
        if (selectedPlayers[key] && selectedPlayers[key].length > 0) {
            return true;
        }
    }
    
    // 檢查先攻選擇
    for (let key in firstAttackData) {
        if (firstAttackData[key]) {
            return true;
        }
    }
    
    // 檢查勝負選擇
    for (let key in winLoseData) {
        if (winLoseData[key]) {
            return true;
        }
    }
    
    // 檢查飲酒加成
    if (bonusTeam) {
        return true;
    }
    
    return false;
}

function markAsChanged() {
    hasUnsavedChanges = true;
    if (window.stateManager) {
        window.stateManager.markAsChanged();
    }
}

function markAsSaved() {
    hasUnsavedChanges = false;
    if (window.stateManager) {
        window.stateManager.markAsSaved();
    }
}

// ===== 選手資料載入 =====
async function loadPlayers() {
    try {
        const response = await fetch('../data/player.json');
        playersData = await response.json();
        console.log('✅ 選手資料載入成功:', playersData);
    } catch (error) {
        console.error('❌ 載入選手資料失敗:', error);
        alert('載入選手資料失敗，請檢查 player.json 文件');
    }
}

// ===== 比賽選擇處理 =====
document.addEventListener('DOMContentLoaded', function() {
    const gameSelect = document.getElementById('gameSelect');
    if (gameSelect) {
        gameSelect.addEventListener('change', handleGameSelection);
    }
});

function handleGameSelection(e) {
    const newGameId = e.target.value;
    
    // 如果有未保存的資料且切換到不同比賽，顯示警告
    if (currentGame && hasAnyData() && hasUnsavedChanges && newGameId !== currentGame.id) {
        const confirmed = confirm('⚠️ 警告！\n\n您有未保存的比賽資料，如果離開將會遺失所有已填寫的內容。\n\n確認要離開當前比賽嗎？');
        if (confirmed) {
            loadGameDetails(newGameId);
        } else {
            // 恢復原來的選擇
            setTimeout(() => {
                e.target.value = currentGame ? currentGame.id : '';
            }, 0);
        }
    } else if (newGameId) {
        loadGameDetails(newGameId);
    } else {
        if (currentGame && hasAnyData() && hasUnsavedChanges) {
            const confirmed = confirm('⚠️ 警告！\n\n您有未保存的比賽資料，如果離開將會遺失所有已填寫的內容。\n\n確認要取消選擇比賽嗎？');
            if (confirmed) {
                resetGameSelection();
            } else {
                setTimeout(() => {
                    e.target.value = currentGame.id;
                }, 0);
            }
        } else {
            resetGameSelection();
        }
    }
}



function loadGameDetails(gameId) {
    console.log('🎯 [DEBUG] loadGameDetails 被調用:', gameId);
    
    // 從下拉選單中獲取比賽資料
    const select = document.getElementById('gameSelect');
    if (!select) {
        console.error('❌ 找不到遊戲選擇下拉選單');
        return;
    }
    
    const selectedOption = Array.from(select.options).find(option => option.value === gameId);
    
    if (!selectedOption) {
        console.error('❌ 找不到比賽資料:', gameId);
        return;
    }
    
    // 解析選項文字以獲取隊伍名稱
    // 格式: "G51 (7/1) - Vivi朝酒晚舞 vs 一鏢開天門"
    const optionText = selectedOption.textContent;
    console.log('📝 [DEBUG] 選項文字:', optionText);
    
    // 嘗試新格式: "G51 (7/1) - Vivi朝酒晚舞 vs 一鏢開天門"
    let match = optionText.match(/^(.+?)\s\((.+?)\)\s-\s(.+?)\svs\s(.+)$/);
    
    if (!match) {
        // 嘗試舊格式: "G51 - Vivi朝酒晚舞 vs 一鏢開天門"
        match = optionText.match(/^.+?\s-\s(.+?)\svs\s(.+)$/);
        if (match) {
            currentGame = {
                id: gameId,
                away: match[1].trim(),
                home: match[2].trim()
            };
        } else {
            console.error('❌ 無法解析比賽資料:', optionText);
            return;
        }
    } else {
        currentGame = {
            id: gameId,
            date: match[2],
            away: match[3].trim(),
            home: match[4].trim()
        };
    }
    
    console.log('🎮 載入比賽:', currentGame);
    
    // 重置遊戲資料（但不重置 currentGame）
    selectedPlayers = {};
    firstAttackData = {};
    winLoseData = {};
    bonusTeam = null;
    hasUnsavedChanges = false;
    
    try {
        // 顯示比賽詳情
        console.log('📊 [DEBUG] 準備顯示比賽詳情...');
        showGameDetails();
        
        // 生成遊戲行
        console.log('🎯 [DEBUG] 準備生成遊戲行...');
        generateGameRows();
        
        // 更新分數計算
        console.log('🧮 [DEBUG] 準備更新分數計算...');
        updateScoreCalculation();
        
        console.log('✅ [DEBUG] 比賽載入完成');
    } catch (error) {
        console.error('🔥 [ERROR] 載入比賽時發生錯誤:', error);
        console.error('📈 錯誤堆疊:', error.stack);
    }
}

function showGameDetails() {
    // 檢查 currentGame 是否存在
    if (!currentGame) {
        console.error('❌ currentGame 為 null，無法顯示比賽詳情');
        return;
    }
    
    // 更新隊伍名稱
    document.getElementById('homeTeamScoreName').textContent = currentGame.home;
    document.getElementById('awayTeamScoreName').textContent = currentGame.away;
    document.getElementById('homeBonusBtn').textContent = currentGame.home;
    document.getElementById('awayBonusBtn').textContent = currentGame.away;
    
    // 顯示比賽詳情區域
    document.getElementById('gameDetails').style.display = 'block';
}

// ===== 遊戲行生成 =====
function generateGameRows() {
    if (!currentGame) {
        console.error('❌ currentGame 為 null，無法生成遊戲行');
        return;
    }
    
    const gameRows = document.getElementById('gameRows');
    
    // 檢查是否已經有內容，避免重複生成
    if (gameRows.children.length > 0) {
        console.log('🔄 [DEBUG] 遊戲行已存在，清空後重新生成');
    }
    
    gameRows.innerHTML = '';
    
    for (let i = 1; i <= 16; i++) {
        const row = createGameRow(i);
        gameRows.appendChild(row);
    }
    
    console.log('✅ [DEBUG] 遊戲行生成完成，共', gameRows.children.length, '行');
}

function createGameRow(setNumber) {
    if (!currentGame) {
        console.error('❌ currentGame 為 null，無法創建遊戲行');
        return document.createElement('div'); // 返回空的 div 避免錯誤
    }
    
    const row = document.createElement('div');
    row.className = 'game-row';
    row.innerHTML = `
        <div class="set-number">SET${setNumber}</div>
        <div class="team-button home-team" data-set="${setNumber}" data-team="home">
            <div class="set-title">${currentGame.home}</div>
            <div class="set-type">${setTypes[setNumber]}</div>
            <div class="player-info" id="home-set${setNumber}-player">點擊選擇選手</div>
        </div>
        <div class="team-button away-team" data-set="${setNumber}" data-team="away">
            <div class="set-title">${currentGame.away}</div>
            <div class="set-type">${setTypes[setNumber]}</div>
            <div class="player-info" id="away-set${setNumber}-player">點擊選擇選手</div>
        </div>
        <div class="control-button" data-set="${setNumber}" data-type="firstAttack" id="attack-set${setNumber}">
            選擇
        </div>
        <div class="control-button" data-set="${setNumber}" data-type="winLose" id="win-set${setNumber}">
            選擇
        </div>
    `;
    
    // 使用 addEventListener 來避免重複綁定
    const homeTeamBtn = row.querySelector('.home-team');
    const awayTeamBtn = row.querySelector('.away-team');
    const attackBtn = row.querySelector('[data-type="firstAttack"]');
    const winBtn = row.querySelector('[data-type="winLose"]');
    
    homeTeamBtn.addEventListener('click', () => {
        console.log('🏠 [DEBUG] 主隊按鈕被點擊:', setNumber);
        openPlayerModal(setNumber, 'home');
    });
    
    awayTeamBtn.addEventListener('click', () => {
        console.log('🚗 [DEBUG] 客隊按鈕被點擊:', setNumber);
        openPlayerModal(setNumber, 'away');
    });
    
    attackBtn.addEventListener('click', () => {
        console.log('⚔️ [DEBUG] 先攻按鈕被點擊:', setNumber);
        toggleControl(setNumber, 'firstAttack');
    });
    
    winBtn.addEventListener('click', () => {
        console.log('🏆 [DEBUG] 勝負按鈕被點擊:', setNumber);
        toggleControl(setNumber, 'winLose');
    });
    
    return row;
}

// ===== 選手選擇功能 =====
// 防重複調用標記
let isPlayerModalOpening = false;

// 定義同組SET（不能重複選手）
const noRepeatGroups = [
    [1, 2, 3, 4],     // SET1-4 不能重複
    [6, 7, 8, 9],     // SET6-9 不能重複
    [11, 12],         // SET11-12 不能重複
    [13, 14]          // SET13-14 不能重複
    // SET5, SET10, SET15, SET16 沒有重複限制
];

// 開啟選手選擇彈窗
function openPlayerModal(setNumber, team) {
    // 防重複調用檢查
    if (isPlayerModalOpening) {
        console.log('⚠️ openPlayerModal 正在執行中，跳過重複調用');
        return;
    }
    
    isPlayerModalOpening = true;
    
    // 檢查 currentGame 是否存在
    if (!currentGame) {
        console.error('❌ currentGame 為 null，無法打開選手彈窗');
        isPlayerModalOpening = false;
        return;
    }
    
    currentSet = setNumber;
    currentTeam = team;
    
    const teamName = team === 'home' ? currentGame.home : currentGame.away;
    const players = playersData[teamName] || [];
    const requiredPlayers = setPlayerCounts[setNumber];
    
    // 初始化選中的選手
    const key = `${currentTeam}-${currentSet}`;
    if (!selectedPlayers[key]) {
        selectedPlayers[key] = [];
    }
    
    document.getElementById('modalTitle').textContent = `選擇選手 - ${teamName}`;
    document.getElementById('modalSubtitle').textContent = `SET${setNumber} - ${setTypes[setNumber]} (需選擇${requiredPlayers}人)`;
    
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-option';
        playerDiv.textContent = player;
        
        // 檢查是否已選中
        if (selectedPlayers[key].includes(player)) {
            playerDiv.classList.add('selected');
        }
        
        playerDiv.addEventListener('click', () => togglePlayerSelection(player, requiredPlayers));
        playerList.appendChild(playerDiv);
    });
    
    document.getElementById('playerModal').style.display = 'block';
    
    // 重置防重複調用標記
    setTimeout(() => {
        isPlayerModalOpening = false;
    }, 100);
}

// 檢查選手是否在同組SET中重複
function checkPlayerConflict(playerName, setNumber, teamType) {
    for (const group of noRepeatGroups) {
        if (group.includes(setNumber)) {
            // 檢查同組其他SET是否已有此選手
            for (const otherSet of group) {
                if (otherSet !== setNumber) {
                    const otherKey = `${teamType}-${otherSet}`;
                    if (selectedPlayers[otherKey] && selectedPlayers[otherKey].includes(playerName)) {
                        return `${playerName} 已在 SET${otherSet} 中出場，同組SET不能重複選擇！`;
                    }
                }
            }
            break;
        }
    }
    return null;
}

// 切換選手選擇狀態
function togglePlayerSelection(playerName, requiredPlayers) {
    const key = `${currentTeam}-${currentSet}`;
    const playerIndex = selectedPlayers[key].indexOf(playerName);
    
    if (playerIndex > -1) {
        // 取消選擇
        selectedPlayers[key].splice(playerIndex, 1);
    } else {
        // 檢查是否會造成重複
        const conflictMessage = checkPlayerConflict(playerName, currentSet, currentTeam);
        if (conflictMessage) {
            alert(conflictMessage);
            return;
        }
        
        // 新增選擇
        if (selectedPlayers[key].length < requiredPlayers) {
            selectedPlayers[key].push(playerName);
        } else {
            alert(`最多只能選擇${requiredPlayers}位選手！`);
            return;
        }
    }
    
    // 更新UI
    const playerOptions = document.querySelectorAll('.player-option');
    playerOptions.forEach(option => {
        if (option.textContent === playerName) {
            option.classList.toggle('selected');
        }
    });
    
    // 即時更新SET按鈕
    updateSetButton(currentSet, currentTeam);
    
    // 標記有變更
    markAsChanged();
    
    // 如果選滿了指定人數，立即關閉彈窗
    if (selectedPlayers[key].length === requiredPlayers) {
        console.log('✅ 選手已滿，立即關閉彈窗:', { key, selectedCount: selectedPlayers[key].length, requiredPlayers });
        closePlayerModal();
    }
}

// 關閉選手彈窗
function closePlayerModal() {
    document.getElementById('playerModal').style.display = 'none';
}

// 添加點擊背景關閉彈窗的功能
document.addEventListener('click', function(e) {
    const playerModal = document.getElementById('playerModal');
    if (e.target === playerModal) {
        closePlayerModal();
    }
});

// 更新SET按鈕顯示
function updateSetButton(setNumber = currentSet, team = currentTeam) {
    if (!setNumber || !team) {
        console.warn('⚠️ updateSetButton: 缺少必要參數', { setNumber, team });
        return;
    }
    
    const key = `${team}-${setNumber}`;
    const playerElement = document.getElementById(`${team}-set${setNumber}-player`);
    const buttonElement = document.querySelector(`[data-set="${setNumber}"][data-team="${team}"]`);
    const requiredPlayers = setPlayerCounts[setNumber];
    const selectedCount = selectedPlayers[key] ? selectedPlayers[key].length : 0;
    
    if (selectedCount > 0) {
        if (selectedCount === requiredPlayers) {
            // 選滿人數 - 變成灰色（已完成）
            playerElement.textContent = `✓ 已選擇: ${selectedPlayers[key].join(', ')}`;
            buttonElement.classList.add('selected');
            buttonElement.classList.remove('incomplete');
        } else {
            // 人數不足 - 保持白色，但顯示進度
            playerElement.textContent = `⚠ 已選擇 ${selectedCount}/${requiredPlayers}: ${selectedPlayers[key].join(', ')}`;
            buttonElement.classList.remove('selected');
            buttonElement.classList.add('incomplete');
        }
    } else {
        // 尚未選擇 - 白色背景
        if (requiredPlayers > 1) {
            playerElement.textContent = `點擊選擇選手 (需${requiredPlayers}人)`;
        } else {
            playerElement.textContent = '點擊選擇選手';
        }
        buttonElement.classList.remove('selected', 'incomplete');
    }
    
    // 更新試算
    updateScoreCalculation();
}

// 更新所有SET按鈕的顯示狀態
function updateAllSetButtons() {
    for (let i = 1; i <= 16; i++) {
        ['home', 'away'].forEach(team => {
            const key = `${team}-${i}`;
            const playerElement = document.getElementById(`${team}-set${i}-player`);
            const buttonElement = document.querySelector(`[data-set="${i}"][data-team="${team}"]`);
            const requiredPlayers = setPlayerCounts[i];
            const selectedCount = selectedPlayers[key] ? selectedPlayers[key].length : 0;
            
            if (selectedCount > 0) {
                if (selectedCount === requiredPlayers) {
                    // 選滿人數 - 變成灰色（已完成）
                    playerElement.textContent = `✓ 已選擇: ${selectedPlayers[key].join(', ')}`;
                    buttonElement.classList.add('selected');
                    buttonElement.classList.remove('incomplete');
                } else {
                    // 人數不足 - 黃色背景，顯示進度
                    playerElement.textContent = `⚠ 已選擇 ${selectedCount}/${requiredPlayers}: ${selectedPlayers[key].join(', ')}`;
                    buttonElement.classList.remove('selected');
                    buttonElement.classList.add('incomplete');
                }
            } else {
                // 尚未選擇 - 白色背景
                if (requiredPlayers > 1) {
                    playerElement.textContent = `點擊選擇選手 (需${requiredPlayers}人)`;
                } else {
                    playerElement.textContent = '點擊選擇選手';
                }
                buttonElement.classList.remove('selected', 'incomplete');
            }
        });
    }
}

// 保留舊的函數名稱以保持兼容性
function updatePlayerDisplay(setNumber, team) {
    updateSetButton(setNumber, team);
}

// ===== 控制選擇功能（先攻/勝負） =====
function toggleControl(setNumber, type) {
    const currentValue = type === 'firstAttack' ? firstAttackData[setNumber] : winLoseData[setNumber];
    let newValue;
    
    // 三狀態循環：未選擇 → 主場 → 客場 → 未選擇
    if (!currentValue) {
        newValue = 'home';
    } else if (currentValue === 'home') {
        newValue = 'away';
    } else {
        newValue = null;
    }
    
    // 更新資料
    if (type === 'firstAttack') {
        firstAttackData[setNumber] = newValue;
    } else {
        winLoseData[setNumber] = newValue;
    }
    
    // 更新按鈕顯示
    updateControlButton(setNumber, type, newValue);
    
    // 標記有變更
    markAsChanged();
    
    // 更新分數計算
    updateScoreCalculation();
}

function updateControlButton(setNumber, type, choice) {
    const button = document.getElementById(`${type === 'firstAttack' ? 'attack' : 'win'}-set${setNumber}`);
    
    // 清除所有選擇狀態
    button.classList.remove('home-selected', 'away-selected');
    
    if (choice) {
        const displayText = choice === 'home' ? '主' : '客';
        button.classList.add(choice === 'home' ? 'home-selected' : 'away-selected');
        
        if (type === 'firstAttack') {
            button.textContent = `${displayText} 先攻`;
        } else {
            button.textContent = `${displayText} 勝`;
        }
    } else {
        button.textContent = '選擇';
    }
}

// ===== 飲酒加成功能 =====
function selectBonus(team) {
    // 清除之前的選擇
    document.getElementById('homeBonusBtn').classList.remove('home-selected');
    document.getElementById('awayBonusBtn').classList.remove('away-selected');
    
    if (bonusTeam === team) {
        // 如果點擊相同的隊伍，取消選擇
        bonusTeam = null;
    } else {
        // 選擇新隊伍
        bonusTeam = team;
        if (team === 'home') {
            document.getElementById('homeBonusBtn').classList.add('home-selected');
        } else {
            document.getElementById('awayBonusBtn').classList.add('away-selected');
        }
    }
    
    // 標記有變更
    markAsChanged();
    
    // 更新分數計算
    updateScoreCalculation();
}

// ===== 分數計算 =====
function updateScoreCalculation() {
    if (!currentGame) return;
    
    let homeScore = 0;
    let awayScore = 0;
    let homeWins = 0;
    let awayWins = 0;
    
    // 計算每個SET的分數
    for (let i = 1; i <= 16; i++) {
        const winner = winLoseData[i];
        if (winner) {
            const setScore = setScores[i];
            if (winner === 'home') {
                homeScore += setScore;
                homeWins++;
            } else {
                awayScore += setScore;
                awayWins++;
            }
        }
    }
    
    // 勝方加分（比賽成績較高的隊伍加1分）
    let homeWinBonus = 0;
    let awayWinBonus = 0;
    
    if (homeScore > awayScore) {
        homeWinBonus = 1;
    } else if (awayScore > homeScore) {
        awayWinBonus = 1;
    }
    // 平手時不加分
    
    // 飲酒加成
    const homeDrinkBonus = bonusTeam === 'home' ? 5 : 0;
    const awayDrinkBonus = bonusTeam === 'away' ? 5 : 0;
    
    // 總分
    const homeTotalScore = homeScore + homeWinBonus + homeDrinkBonus;
    const awayTotalScore = awayScore + awayWinBonus + awayDrinkBonus;
    
    // 更新顯示
    document.getElementById('homeOriginalScore').textContent = homeScore;
    document.getElementById('awayOriginalScore').textContent = awayScore;
    document.getElementById('homeWinBonus').textContent = homeWinBonus;
    document.getElementById('awayWinBonus').textContent = awayWinBonus;
    document.getElementById('homeDrinkBonus').textContent = homeDrinkBonus;
    document.getElementById('awayDrinkBonus').textContent = awayDrinkBonus;
    document.getElementById('homeTotalScore').textContent = homeTotalScore;
    document.getElementById('awayTotalScore').textContent = awayTotalScore;
    
    console.log('📊 分數更新:', {
        home: { score: homeScore, wins: homeWins, winBonus: homeWinBonus, drinkBonus: homeDrinkBonus, total: homeTotalScore },
        away: { score: awayScore, wins: awayWins, winBonus: awayWinBonus, drinkBonus: awayDrinkBonus, total: awayTotalScore }
    });
}

// ===== 自動填入測試資料 (開發用功能，測試用已啟用) =====
function autoFillTestData() {
    if (!currentGame) {
        alert('❌ 請先選擇比賽！');
        return;
    }
    
    console.log('🎲 [DEBUG] 開始自動填入測試資料...');
    console.log('🔍 [DEBUG] 自動填入前的彈窗狀態:', document.getElementById('playerModal').style.display);
    
    // 隊伍名稱正規化映射
    const teamNameMapping = {
        "VIVI朝酒晚舞": "Vivi朝酒晚舞",
        "Vivi朝酒晚舞": "Vivi朝酒晚舞"
    };
    
    // 正規化隊伍名稱
    const normalizeTeamName = (name) => teamNameMapping[name] || name;
    
    const homeTeamNormalized = normalizeTeamName(currentGame.home);
    const awayTeamNormalized = normalizeTeamName(currentGame.away);
    
    // 檢查選手資料
    const homePlayers = playersData[homeTeamNormalized];
    const awayPlayers = playersData[awayTeamNormalized];
    
    console.log('🏠 主隊選手:', homeTeamNormalized, homePlayers);
    console.log('✈️ 客隊選手:', awayTeamNormalized, awayPlayers);
    
    if (!homePlayers || !awayPlayers) {
        alert(`❌ 找不到隊伍選手資料！\n主隊: ${homeTeamNormalized}\n客隊: ${awayTeamNormalized}`);
        return;
    }
    
    // 填入每個SET的資料
    for (let i = 1; i <= 16; i++) {
        const requiredPlayers = setPlayerCounts[i];
        
        // 隨機選擇選手
        const homeSelected = getRandomPlayers(homePlayers, requiredPlayers);
        const awaySelected = getRandomPlayers(awayPlayers, requiredPlayers);
        
        selectedPlayers[`home-${i}`] = homeSelected;
        selectedPlayers[`away-${i}`] = awaySelected;
        
        // 隨機設定先攻
        firstAttackData[i] = Math.random() > 0.5 ? 'home' : 'away';
        
        // 隨機設定勝負
        winLoseData[i] = Math.random() > 0.5 ? 'home' : 'away';
        
        console.log(`SET${i}: 主隊=${homeSelected.join(',')}, 客隊=${awaySelected.join(',')}, 先攻=${firstAttackData[i]}, 勝負=${winLoseData[i]}`);
    }
    
    // 隨機設定飲酒加成
    const bonusOptions = ['home', 'away', null];
    bonusTeam = bonusOptions[Math.floor(Math.random() * bonusOptions.length)];
    
    console.log('🍺 飲酒加成:', bonusTeam);
    
    // 更新所有顯示
    updateAllDisplays();
    
    // 標記有變更
    markAsChanged();
    
    alert('🎲 自動填入完成！\n\n所有SET的選手、先攻、勝負都已隨機設定。');
}

function getRandomPlayers(players, count) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function updateAllDisplays() {
    console.log('🔄 updateAllDisplays 被調用');
    
    // 更新所有SET按鈕顯示
    updateAllSetButtons();
    
    // 更新控制按鈕
    for (let i = 1; i <= 16; i++) {
        updateControlButton(i, 'firstAttack', firstAttackData[i]);
        updateControlButton(i, 'winLose', winLoseData[i]);
    }
    
    // 更新飲酒加成顯示
    document.getElementById('homeBonusBtn').classList.remove('selected');
    document.getElementById('awayBonusBtn').classList.remove('selected');
    if (bonusTeam) {
        document.getElementById(`${bonusTeam}BonusBtn`).classList.add('selected');
    }
    
    // 更新分數計算
    updateScoreCalculation();
    
    console.log('✅ updateAllDisplays 完成');
}

// ===== 保存功能 =====
// 檢查資料完整性
function validateGameData() {
    const missingData = [];
    
    // 檢查所有SET的選手選擇
    for (let i = 1; i <= 16; i++) {
        const homeKey = `home-${i}`;
        const awayKey = `away-${i}`;
        const requiredPlayers = setPlayerCounts[i];
        
        if (!selectedPlayers[homeKey] || selectedPlayers[homeKey].length !== requiredPlayers) {
            missingData.push(`SET${i} 主場選手`);
        }
        if (!selectedPlayers[awayKey] || selectedPlayers[awayKey].length !== requiredPlayers) {
            missingData.push(`SET${i} 客場選手`);
        }
    }
    
    // 檢查先攻選擇
    for (let i = 1; i <= 16; i++) {
        if (!firstAttackData[i]) {
            missingData.push(`SET${i} 先攻`);
        }
    }
    
    // 檢查勝負選擇
    for (let i = 1; i <= 16; i++) {
        if (!winLoseData[i]) {
            missingData.push(`SET${i} 勝負`);
        }
    }
    
    // 檢查飲酒加成選擇
    if (!bonusTeam) {
        missingData.push(`飲酒加成未選擇`);
    }
    
    return missingData;
}

// 保存比賽資料
async function saveGameData() {
    // 檢查是否有選擇比賽
    if (!currentGame) {
        await showCustomAlert('請先選擇比賽！', 'warning');
        return;
    }
    
    // 檢查資料完整性
    const missingData = validateGameData();
    if (missingData.length > 0) {
        await showCustomAlert(`以下場次尚未登記完成：\n\n${missingData.join('\n')}\n\n請先完成所有欄位的填寫。`, 'warning', {
            showDontRemind: true,
            rememberKey: 'incompleteDataWarning'
        });
        return;
    }
    
    // 準備保存的資料
    const gameData = {
        gameId: document.getElementById('gameSelect').value,
        homeTeam: currentGame.home,
        awayTeam: currentGame.away,
        selectedPlayers: selectedPlayers,
        firstAttackData: firstAttackData,
        winLoseData: winLoseData,
        bonusTeam: bonusTeam,
        scores: {
            home: {
                original: parseInt(document.getElementById('homeOriginalScore').textContent),
                winBonus: parseInt(document.getElementById('homeWinBonus').textContent),
                drinkBonus: parseInt(document.getElementById('homeDrinkBonus').textContent),
                total: parseInt(document.getElementById('homeTotalScore').textContent)
            },
            away: {
                original: parseInt(document.getElementById('awayOriginalScore').textContent),
                winBonus: parseInt(document.getElementById('awayWinBonus').textContent),
                drinkBonus: parseInt(document.getElementById('awayDrinkBonus').textContent),
                total: parseInt(document.getElementById('awayTotalScore').textContent)
            }
        },
        timestamp: new Date().toISOString()
    };
    
    // 確認對話框 - 顯示比分
    const confirmMessage = `請確認比賽結果：\n\n比賽：${gameData.gameId.toUpperCase()}\n\n${gameData.homeTeam}：${gameData.scores.home.total} 分\n${gameData.awayTeam}：${gameData.scores.away.total} 分\n\n確認無誤後將寫入`;
    
    if (confirm(confirmMessage)) {
        await saveToGoogleSheetsWithHTML(gameData);
    }
}

// 保存到 Google Sheets（包含 HTML 和選手統計）
async function saveToGoogleSheetsWithHTML(gameData) {
    const saveBtn = document.querySelector('.save-btn');
    if (!saveBtn) {
        console.error('❌ 找不到保存按鈕');
        await showCustomAlert('❌ 系統錯誤：找不到保存按鈕', 'error');
        return;
    }
    const originalText = saveBtn.textContent;
    
    try {
        // 顯示載入狀態
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;
        
        console.log('準備保存資料：', gameData);
        
        // 生成時間戳記 (GMT+8)
        const now = new Date();
        const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000)).toISOString();
        const formattedTime = gmt8Time.replace('T', ' ').replace(/\.\d{3}Z$/, '').replace(/:/g, '-');
        const gameCode = gameData.gameId;
        
        // 收集Admin格式的資料用於HTML生成
        const adminFormatData = collectAdminData();
        
        // 生成完整的 HTML 文件（類似 g89.html 格式）
        const previewGenerator = new GameResultPreviewGenerator();
        const htmlContent = previewGenerator.generateFullHTML(adminFormatData);
        
        // 計算選手統計資料
        const playerStats = computePlayerStats(gameData);
        
        // 準備寫入 Google Sheets 的資料
        const sheetsData = {
            ...gameData,
            htmlContent: htmlContent,
            htmlSheetName: `${gameCode}.html`,
            playerStats: playerStats,
            timestamp: formattedTime,
            gameDate: adminFormatData.gameDate // 傳遞日期給 GAS 判斷賽季
        };
        
        // Google Apps Script Web App URL
        const scriptURL = 'https://script.google.com/macros/s/AKfycbw96zr198osWO2HIeFbKMaHaM3-WqkHcDJ1F_OmTJdulf3Euv2E9K7LrdRpMORMr5lW/exec';
        
        console.log('發送請求到：', scriptURL);
        console.log('HTML 工作表名稱：', sheetsData.htmlSheetName);
        
        const response = await fetch(scriptURL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(sheetsData)
        });
        
        console.log('收到回應：', response.status, response.statusText);
        
        if (response.ok) {
            const resultText = await response.text();
            console.log('回應內容：', resultText);
            
            try {
                const result = JSON.parse(resultText);
                if (result.status === 'success') {
                    markAsSaved();
                    
                    // 讀取 GAS 伺服器端的 GitHub 上傳結果（GAS 已自動處理上傳，不需要前端再次上傳）
                    const githubUpload = result.githubUpload;
                    if (githubUpload && githubUpload.status === 'success') {
                        console.log('✅ GitHub 上傳成功（由 GAS 伺服器端處理）:', githubUpload);
                    } else if (githubUpload) {
                        console.warn('⚠️ GitHub 上傳失敗，但 Google Sheets 保存成功:', githubUpload);
                    }
                    
                    // 構建成功訊息
                    let successMessage = `✅ 比賽資料已成功保存！\n\n比賽：${result.gameId}\nHTML 工作表：${sheetsData.htmlSheetName}\n時間：${formattedTime}`;
                    
                    if (githubUpload && githubUpload.status === 'success') {
                        successMessage += `\n\n✅ 已上傳到 GitHub: ${githubUpload.filePath}`;
                    } else if (githubUpload && githubUpload.status === 'error') {
                        successMessage += `\n\n⚠️ GitHub 上傳失敗: ${githubUpload.message || '未知錯誤'}`;
                    }
                    
                    successMessage += `\n\n頁面將自動關閉...`;
                    
                    await showCustomAlert(successMessage, 'success');
                    console.log('保存成功：', result);
                    
                    // 延遲 1 秒後關閉分頁
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    throw new Error(result.message || '保存失敗');
                }
            } catch (parseError) {
                console.error('解析回應失敗：', parseError);
                // 如果無法解析 JSON，但狀態碼是 200，可能還是成功了
                if (resultText.includes('success') || resultText.includes('成功') || resultText.includes('"status":"success"')) {
                    markAsSaved();
                    await showCustomAlert(`✅ 比賽資料已保存完成！\n\nHTML 工作表：${sheetsData.htmlSheetName}\n\n頁面將自動關閉...`, 'success');
                    
                    // 延遲 1 秒後關閉分頁
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    throw new Error('伺服器回應格式錯誤：' + resultText.substring(0, 100));
                }
            }
        } else {
            const errorText = await response.text();
            console.error('HTTP 錯誤：', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('保存到 Google Sheets 失敗：', error);
        
        let errorMessage = '保存失敗！';
        if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
            errorMessage += '\n\n可能原因：\n1. 網路連線問題\n2. Google Apps Script 未正確部署\n3. 跨域請求被阻擋';
        } else {
            errorMessage += '\n\n錯誤資訊：' + error.message;
        }
        
        await showCustomAlert(errorMessage, 'error');
        
        // 降級保存到本地存儲
        const confirmResult = await showCustomConfirm('是否改為保存到本地存儲？');
        if (confirmResult) {
            await saveToLocalStorage(gameData);
        }
    } finally {
        // 恢復按鈕狀態
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// 保存到 Google Sheets（原始版本，保留作為備用）
async function saveToGoogleSheets(gameData) {
    const saveBtn = document.querySelector('.save-btn');
    if (!saveBtn) {
        console.error('❌ 找不到保存按鈕');
        await showCustomAlert('❌ 系統錯誤：找不到保存按鈕', 'error');
        return;
    }
    const originalText = saveBtn.textContent;
    
    try {
        // 顯示載入狀態
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;
        
        console.log('準備保存資料：', gameData);
        
        // Google Apps Script Web App URL
        const scriptURL = 'https://script.google.com/macros/s/AKfycbw96zr198osWO2HIeFbKMaHaM3-WqkHcDJ1F_OmTJdulf3Euv2E9K7LrdRpMORMr5lW/exec';
        
        console.log('發送請求到：', scriptURL);
        
        const response = await fetch(scriptURL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain', // 改為 text/plain 避免 CORS 預檢
            },
            body: JSON.stringify(gameData)
        });
        
        console.log('收到回應：', response.status, response.statusText);
        
        if (response.ok) {
            const resultText = await response.text();
            console.log('回應內容：', resultText);
            
            try {
                const result = JSON.parse(resultText);
                if (result.status === 'success') {
                    markAsSaved();
                    await showCustomAlert(`✅ 比賽資料已成功保存！\n\n比賽：${result.gameId}\n時間：${new Date(result.timestamp).toLocaleString()}\n\n頁面將自動關閉...`, 'success');
                    console.log('保存成功：', result);
                    
                    // 延遲 1 秒後關閉分頁
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    throw new Error(result.message || '保存失敗');
                }
            } catch (parseError) {
                console.error('解析回應失敗：', parseError);
                // 如果無法解析 JSON，但狀態碼是 200，可能還是成功了
                if (resultText.includes('success') || resultText.includes('成功') || resultText.includes('"status":"success"')) {
                    markAsSaved();
                    await showCustomAlert('✅ 比賽資料已保存完成！\n\n頁面將自動關閉...', 'success');
                    
                    // 延遲 1 秒後關閉分頁
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    throw new Error('伺服器回應格式錯誤：' + resultText.substring(0, 100));
                }
            }
        } else {
            const errorText = await response.text();
            console.error('HTTP 錯誤：', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('保存到 Google Sheets 失敗：', error);
        
        let errorMessage = '保存失敗！';
        if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
            errorMessage += '\n\n可能原因：\n1. 網路連線問題\n2. Google Apps Script 未正確部署\n3. 跨域請求被阻擋';
        } else {
            errorMessage += '\n\n錯誤資訊：' + error.message;
        }
        
        await showCustomAlert(errorMessage, 'error');
        
        // 降級保存到本地存儲
        const confirmResult = await showCustomConfirm('是否改為保存到本地存儲？');
        if (confirmResult) {
            await saveToLocalStorage(gameData);
        }
    } finally {
        // 恢復按鈕狀態
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// 計算選手統計資料（給 GAS 寫入 data 頁籤用）
function computePlayerStats(gameData) {
    const stats = { away: [], home: [] };
    
    ['away', 'home'].forEach(team => {
        // 收集該隊所有出場選手
        const playerMap = {};
        
        for (let i = 1; i <= 16; i++) {
            const key = `${team}-${i}`;
            const players = gameData.selectedPlayers[key] || [];
            if (!players.length) continue;
            
            // 判斷比賽類型：SET 6~10 是 CR，其餘是 01
            const isCR = (i >= 6 && i <= 10);
            const isWin = gameData.winLoseData[i] === team;
            const isFirstAttack = gameData.firstAttackData[i] === team;
            
            players.forEach(name => {
                if (!name) return;
                if (!playerMap[name]) {
                    playerMap[name] = { name, p01: 0, w01: 0, pCR: 0, wCR: 0, total: 0, wins: 0, fa: 0 };
                }
                const p = playerMap[name];
                p.total++;
                if (isWin) p.wins++;
                if (isFirstAttack) p.fa++;
                if (isCR) {
                    p.pCR++;
                    if (isWin) p.wCR++;
                } else {
                    p.p01++;
                    if (isWin) p.w01++;
                }
            });
        }
        
        stats[team] = Object.values(playerMap);
    });
    
    return stats;
}

// 保存到本地存儲（降級方案）
async function saveToLocalStorage(gameData) {
    try {
        const storageKey = `gameData_${gameData.gameId}_${new Date().getTime()}`;
        localStorage.setItem(storageKey, JSON.stringify(gameData));
        
        markAsSaved();
        await showCustomAlert(`✅ 比賽資料已保存到本地存儲！\n\n存儲鍵：${storageKey}\n\n請稍後手動上傳或重新嘗試線上保存。`, 'success');
        
        console.log('本地保存成功：', storageKey, gameData);
    } catch (error) {
        console.error('本地保存失敗：', error);
        await showCustomAlert('❌ 本地保存也失敗了！請檢查瀏覽器設定。', 'error');
    }
}

// ===== 資料收集功能 =====
// 📊 收集admin系統的所有數據
function collectAdminData() {
    const sets = [];
    
    // 收集每個SET的數據
    for (let i = 1; i <= 16; i++) {
        const homeKey = `home-${i}`;
        const awayKey = `away-${i}`;
        
        sets.push({
            setNumber: i,
            setType: setTypes[i],
            awayPlayers: selectedPlayers[awayKey] || [],
            homePlayers: selectedPlayers[homeKey] || [],
            firstAttack: firstAttackData[i] || null,
            winner: winLoseData[i] || null
        });
    }

    return {
        gameId: document.getElementById('gameSelect').value,
        gameDate: currentGame.date || new Date().toLocaleDateString('zh-TW').replace(/\//g, '/'),
        awayTeam: currentGame.away,
        homeTeam: currentGame.home,
        sets: sets,
        drinkingBonus: {
            away: bonusTeam === 'away' ? 5 : 0,
            home: bonusTeam === 'home' ? 5 : 0
        }
    };
}

// 為了向後相容，保留舊的函數名稱
function collectGameData() {
    return collectAdminData();
}

// ===== 預覽功能 =====
// 🎮 預覽比賽結果功能
async function showGamePreview() {
    // 檢查是否選擇了比賽
    if (!currentGame) {
        await showCustomAlert('❌ 請先選擇比賽！', 'warning');
        return;
    }

    // 收集當前的比賽數據
    const adminData = collectAdminData();
    
    // Console檢查模式：輸出詳細的資料和HTML
    console.group('🎮 比賽預覽檢查');
    console.log('📊 收集到的管理資料:', adminData);
    
    try {
        // 生成HTML預覽
        const previewGenerator = new GameResultPreviewGenerator();
        const htmlContent = previewGenerator.generatePreviewHTML(adminData);
        
        console.log('📄 生成的HTML內容:');
        console.log(htmlContent);
        
        // 檢查選手資料
        console.log('👥 選手資料檢查:');
        console.log('主場選手:', previewGenerator.extractPlayers(adminData, 'home'));
        console.log('客場選手:', previewGenerator.extractPlayers(adminData, 'away'));
        
        // 檢查比賽資料轉換
        const matchData = previewGenerator.convertToMatchData(adminData);
        console.log('🎯 轉換後的比賽資料:', matchData);
        
        // 檢查分數計算
        const finalScores = previewGenerator.calculateFinalScores(matchData, adminData.drinkingBonus || {});
        console.log('📊 最終分數:', finalScores);
        
        console.groupEnd();
        
        // 顯示預覽模態框
        showPreviewModal(adminData);
    } catch (error) {
        console.error('❌ 預覽生成失敗:', error);
        console.groupEnd();
        await showCustomAlert('❌ 預覽生成失敗，請檢查資料填寫是否正確', 'error');
    }
}

// ===== 預覽回調函數 =====
window.confirmPreviewSave = function() {
    // 調用保存函數
    saveGameData();
};

window.backToEditFromPreview = function() {
    console.log('返回編輯模式');
};

window.closePreview = function() {
    const modalElement = document.getElementById('previewModal');
    if (modalElement) {
        modalElement.remove();
    }
};

// ===== 彈窗關閉事件 =====
// 移除可能干擾的彈窗關閉監聽器

// ===== 匯出全域函數 =====
window.logout = logout;
window.openPlayerModal = openPlayerModal;
window.toggleControl = toggleControl;
window.selectBonus = selectBonus;
window.autoFillTestData = autoFillTestData; // 開發用功能已啟用
window.saveGameData = saveGameData;
window.showGamePreview = showGamePreview; 