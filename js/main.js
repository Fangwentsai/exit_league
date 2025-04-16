// 配置信息
const CONFIG = {
    SEASON3: {
        SHEET_ID: '1Rjxr6rT_NfonXtYYsxpo3caYJbvI-fxc2WQh3tKBSC8',
        API_KEY: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
        SEASON_FILTER: '3'
    },
    SEASON4: {
        SHEET_ID: '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE',
        API_KEY: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
        SEASON_FILTER: '4'
    }
};

// 調試輸出
console.log('CONFIG 對象已加載');
console.log('CONFIG.SEASON3:', CONFIG.SEASON3);
console.log('CONFIG.SEASON4:', CONFIG.SEASON4);

// 漢堡選單處理
function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            sidebar.classList.toggle('active');
            if (overlay) {
                overlay.classList.toggle('active');
            }
        });

        // 點擊遮罩層時關閉側邊欄
        if (overlay) {
            overlay.addEventListener('click', () => {
                hamburger.classList.remove('active');
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }
}

// 設置導航
function setupNavigation() {
    document.querySelectorAll('.sidebar-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const page = this.dataset.page;
            const submenu = this.nextElementSibling;
            
            // 檢查是否有子選單
            if (submenu && submenu.classList.contains('sidebar-submenu')) {
                e.preventDefault(); // 阻止頁面切換
                
                // 關閉其他所有子選單
                document.querySelectorAll('.sidebar-submenu').forEach(menu => {
                    if (menu !== submenu) {
                        menu.classList.remove('active');
                        menu.previousElementSibling.classList.remove('active');
                    }
                });
                
                // 切換當前子選單
                this.classList.toggle('active');
                submenu.classList.toggle('active');
            } else if (page) {
                // 如果是一般按鈕，載入對應頁面
                loadContent(page);
                // 關閉側邊欄
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.overlay');
                const hamburger = document.querySelector('.hamburger-btn');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
            }
        });
    });

    // 子選單項目的點擊事件
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                loadContent(page);
                // 關閉側邊欄
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.overlay');
                const hamburger = document.querySelector('.hamburger-btn');
                if (sidebar) sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
            }
        });
    });
}

function loadContent(page = 'news') {
    console.log('Loading page:', page);
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = '<div class="loading">載入中...</div>';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `pages/${page}.html`, true);

    xhr.onload = async function() {
        console.log('XHR status:', xhr.status);
        if (xhr.status === 200) {
            contentArea.innerHTML = xhr.responseText;

            // 根據頁面類型載入不同的數據
            if (page === 'news') {
                await loadNewsData();
            } 
            else if (page === 'rank' || page === 'rankS4') {
                await loadRankData(page);
            }
            else if (page === 'schedule' || page === 'scheduleS4') {
                await loadScheduleData(page);
            }

            // 更新按鈕狀態
            updateButtonStates(page);
        } else {
            showError(xhr.statusText);
        }
    };

    xhr.onerror = function() {
        showError('Network error occurred');
    };

    xhr.send();
}

// 更新按鈕狀態
function updateButtonStates(page) {
    document.querySelectorAll('.nav-btn, .sidebar-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
}

// 顯示錯誤信息
function showError(message) {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="error-message">
            載入失敗，請稍後再試
            <br>
            錯誤訊息：${message}
        </div>
    `;
}

// 新聞頁面數據加載
async function loadNewsData() {
    try {
        const response = await fetch('/data/schedule_s4.json');
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        
        const data = await response.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let lastMatch = null;
        let nextMatch = null;
        let minPastDiff = Infinity;
        let minFutureDiff = Infinity;
        
        data.schedule.forEach(matchDay => {
            const [year, month, day] = matchDay.date.split('/');
            const matchDate = new Date(year, month - 1, day);
            matchDate.setHours(0, 0, 0, 0);
            
            const timeDiff = matchDate - today;
            
            if (timeDiff < 0 && Math.abs(timeDiff) < minPastDiff) {
                minPastDiff = Math.abs(timeDiff);
                lastMatch = matchDay;
            }
            
            if (timeDiff > 0 && timeDiff < minFutureDiff) {
                minFutureDiff = timeDiff;
                nextMatch = matchDay;
            }
        });

        // 更新顯示
        updateNewsContent(lastMatch, nextMatch);
    } catch (error) {
        console.error('載入新聞數據時發生錯誤:', error);
        showNewsError(error.message);
    }
}

// 排名頁面數據加載
async function loadRankData(page) {
    try {
        const currentSeason = page === 'rankS4' ? 'SEASON4' : 'SEASON3';
        const config = CONFIG[currentSeason];
        if (!config) throw new Error('找不到配置');

        // 載入團隊排名
        const rankResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/schedule!K:Q?key=${config.API_KEY}`);
        if (!rankResponse.ok) throw new Error(`HTTP 錯誤! 狀態: ${rankResponse.status}`);
        
        const rankData = await rankResponse.json();
        if (!rankData.values || rankData.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        // 更新團隊排名表格
        updateTeamRankings(rankData.values.slice(1));

        // 載入個人排名
        const personalResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/personal!A:I?key=${config.API_KEY}`);
        if (!personalResponse.ok) throw new Error(`HTTP 錯誤! 狀態: ${personalResponse.status}`);
        
        const personalData = await personalResponse.json();
        if (!personalData.values || personalData.values.length === 0) {
            throw new Error('No personal data found in sheet');
        }

        // 更新個人排名表格
        updatePersonalRankings(personalData.values.slice(1));

    } catch (error) {
        console.error('載入排名數據時發生錯誤:', error);
        showRankError(error.message);
    }
}

// 賽程頁面數據加載
async function loadScheduleData(page) {
    try {
        const currentSeason = page === 'scheduleS4' ? 'SEASON4' : 'SEASON3';
        const config = CONFIG[currentSeason];
        if (!config) throw new Error('找不到配置');

        // 顯示加載進度條
        showLoadingBar();

        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/schedule!A:F?key=${config.API_KEY}`);
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        
        const data = await response.json();
        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        // 更新賽程表格
        updateScheduleTable(data.values);
        
        // 隱藏加載進度條
        hideLoadingBar();

        // 設置篩選功能
        setupScheduleFilters();

    } catch (error) {
        console.error('載入賽程數據時發生錯誤:', error);
        showScheduleError(error.message);
        hideLoadingBar();
    }
}

// 更新新聞內容
function updateNewsContent(lastMatch, nextMatch) {
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    
    if (lastWeekContent) {
        lastWeekContent.innerHTML = lastMatch ? createMatchesHTML(lastMatch) : '<p>沒有上週的比賽記錄</p>';
    }
    
    if (upcomingContent) {
        upcomingContent.innerHTML = nextMatch ? createMatchesHTML(nextMatch) : '<p>沒有即將到來的比賽</p>';
    }
}

// 更新團隊排名
function updateTeamRankings(data) {
    const tableBody = document.getElementById('rankTableBody');
    if (!tableBody) return;

    const rankings = data.map(row => ({
        team: row[0] || '',
        wins: row[1] || '',
        losses: row[2] || '',
        draws: row[3] || '',
        points: row[4] || '',
        bonus: row[5] || '',
        total: parseFloat(row[6] || 0)
    })).sort((a, b) => b.total - a.total);

    tableBody.innerHTML = rankings.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${row.team}</td>
            <td>${row.wins}</td>
            <td>${row.losses}</td>
            <td>${row.draws}</td>
            <td>${row.points}</td>
            <td>${row.bonus}</td>
            <td>${row.total}</td>
        </tr>
    `).join('');
}

// 更新個人排名
function updatePersonalRankings(data) {
    const personalTableBody = document.getElementById('personalTableBody');
    if (!personalTableBody) return;

    const rankings = data.map(row => ({
        team: row[0] || '',
        name: row[1] || '',
        wins01: parseFloat(row[2]) || 0,
        rate01: parseFloat(row[3]) || 0,
        winsCR: parseFloat(row[4]) || 0,
        rateCR: parseFloat(row[5]) || 0,
        totalWins: parseFloat(row[6]) || 0,
        totalRate: parseFloat(row[7]) || 0,
        firstRate: parseFloat(row[8]) || 0
    })).sort((a, b) => b.totalWins - a.totalWins);

    personalTableBody.innerHTML = rankings.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${row.team}</td>
            <td>${row.name}</td>
            <td>${row.wins01}</td>
            <td>${row.rate01}%</td>
            <td>${row.winsCR}</td>
            <td>${row.rateCR}%</td>
            <td>${row.totalWins}</td>
            <td>${row.totalRate}%</td>
            <td>${row.firstRate}%</td>
        </tr>
    `).join('');
}

// 更新賽程表格
function updateScheduleTable(data) {
    const table = document.getElementById('leagueTable');
    if (!table) return;

    const headers = ['日期/場次', '客隊', '客隊得分', '', '主隊得分', '主隊'];
    
    // 過濾掉空白行（至少要有日期或隊伍名稱）
    const filteredData = data.slice(1).filter(row => {
        return row && (row[0]?.trim() || row[1]?.trim() || row[5]?.trim());
    });

    table.innerHTML = `
        <thead>
            <tr>
                ${headers.map((header, index) => `
                    <th style="${index === 0 ? 'background-color: #f0f0f0;' : ''}">${header}</th>
                `).join('')}
            </tr>
        </thead>
        <tbody>
            ${filteredData.map(row => `
                <tr>
                    <td>${row[0] || ''}</td>
                    <td>${row[1] || ''}</td>
                    <td>${row[2] || ''}</td>
                    <td>VS</td>
                    <td>${row[4] || ''}</td>
                    <td>${row[5] || ''}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
}

// 設置賽程篩選功能
function setupScheduleFilters() {
    const teamButtons = document.querySelectorAll('.team-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    const leagueTable = document.getElementById('leagueTable');
    
    // 存儲選中的隊伍
    let selectedTeams = [];

    // 為隊伍按鈕添加點擊事件
    teamButtons.forEach(button => {
        button.addEventListener('click', function() {
            const team = this.getAttribute('data-team');
            this.classList.toggle('selected');
            
            if (this.classList.contains('selected')) {
                if (!selectedTeams.includes(team)) {
                    selectedTeams.push(team);
                }
            } else {
                selectedTeams = selectedTeams.filter(t => t !== team);
            }
            
            filterScheduleTable(selectedTeams);
        });
    });

    // 取消按鈕點擊事件
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            teamButtons.forEach(button => button.classList.remove('selected'));
            selectedTeams = [];
            filterScheduleTable(selectedTeams);
        });
    }
}

// 篩選賽程表格
function filterScheduleTable(selectedTeams) {
    const leagueTable = document.getElementById('leagueTable');
    if (!leagueTable) return;

    const rows = leagueTable.querySelectorAll('tbody tr');
    
    if (selectedTeams.length === 0) {
        // 如果沒有選中的隊伍，顯示所有行
        rows.forEach(row => row.style.display = '');
        return;
    }

    rows.forEach(row => {
        if (row.cells.length >= 6) {
            const homeTeam = row.cells[5].textContent.trim(); // 主隊
            const awayTeam = row.cells[1].textContent.trim(); // 客隊
            
            if (selectedTeams.includes(homeTeam) || selectedTeams.includes(awayTeam)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// 創建比賽 HTML
function createMatchesHTML(matchDay) {
    return `
        <div class="match-date">${matchDay.date}</div>
        <div class="matches-container">
            ${matchDay.games.map(game => `
                <div class="match-item" onclick="showGameResult('${game.game_number}')">
                    ${game.team1} <span class="vs">VS</span> ${game.team2}
                </div>
            `).join('')}
        </div>
    `;
}

// 顯示比賽結果
function showGameResult(gameNumber) {
    const modal = document.getElementById('gameModal');
    const gameFrame = document.getElementById('gameFrame');
    const closeBtn = document.querySelector('.close');
    
    if (modal && gameFrame) {
        modal.style.display = 'block';
        gameFrame.src = `game_result/season4/${gameNumber}.html`;

        // 點擊關閉按鈕關閉 modal
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            gameFrame.src = ''; // 清空 iframe 內容
        }

        // 點擊 modal 外部關閉
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                gameFrame.src = ''; // 清空 iframe 內容
            }
        }
    }
}

function showLoadingBar() {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.display = 'block';
        const loadingProgress = loadingBar.querySelector('.loading-progress');
        if (loadingProgress) {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                loadingProgress.style.width = `${Math.min(progress, 90)}%`;
                if (progress >= 90) clearInterval(progressInterval);
            }, 100);
        }
    }
}

function hideLoadingBar() {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        const loadingProgress = loadingBar.querySelector('.loading-progress');
        if (loadingProgress) {
            loadingProgress.style.width = '100%';
        }
        setTimeout(() => {
            loadingBar.style.display = 'none';
        }, 500);
    }
}

// 錯誤處理函數
function showNewsError(message) {
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    
    if (lastWeekContent) {
        lastWeekContent.innerHTML = `<p>載入上週戰況時發生錯誤: ${message}</p>`;
    }
    if (upcomingContent) {
        upcomingContent.innerHTML = `<p>載入近期比賽時發生錯誤: ${message}</p>`;
    }
}

function showRankError(message) {
    const rankTableBody = document.getElementById('rankTableBody');
    const personalTableBody = document.getElementById('personalTableBody');
    
    if (rankTableBody) {
        rankTableBody.innerHTML = `<tr><td colspan="8">載入排名時發生錯誤: ${message}</td></tr>`;
    }
    if (personalTableBody) {
        personalTableBody.innerHTML = `<tr><td colspan="10">載入個人排名時發生錯誤: ${message}</td></tr>`;
    }
}

function showScheduleError(message) {
    const leagueTable = document.getElementById('leagueTable');
    if (leagueTable) {
        leagueTable.innerHTML = `<tr><td colspan="6">載入賽程時發生錯誤: ${message}</td></tr>`;
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    loadContent('news');

    // 漢堡選單處理
    setupHamburgerMenu();

    // 設置導航事件
    setupNavigation();
});

