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
    
    function closeAllSubmenus() {
        document.querySelectorAll('.sidebar-submenu').forEach(menu => {
            menu.classList.remove('active');
            if (menu.previousElementSibling) {
                menu.previousElementSibling.classList.remove('active');
            }
        });
    }
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            const isClosing = sidebar.classList.contains('active');
            hamburger.classList.toggle('active');
            sidebar.classList.toggle('active');
            if (overlay) {
                overlay.classList.toggle('active');
            }
            
            // 如果是關閉側邊欄，同時關閉所有子目錄
            if (isClosing) {
                closeAllSubmenus();
            }
        });

        // 點擊遮罩層時關閉側邊欄
        if (overlay) {
            overlay.addEventListener('click', () => {
                hamburger.classList.remove('active');
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                closeAllSubmenus();
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
            const anchor = this.dataset.anchor;
            
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
                loadContent(page, anchor);
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
            const anchor = this.dataset.anchor;
            if (page) {
                loadContent(page, anchor);
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

// 載入內容
function loadContent(page, anchor = null, pushState = true) {
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    // 顯示載入中
    contentArea.innerHTML = '<div class="loading">載入中...</div>';

    // 構建頁面路徑
    const pagePath = `pages/${page}.html`;

    // 讀取頁面內容
    fetch(pagePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('頁面載入失敗');
            }
            return response.text();
        })
        .then(html => {
            contentArea.innerHTML = html;
            
            // 確保標題顏色保持白色
            const mainTitle = document.querySelector('.main-title');
            if (mainTitle) {
                mainTitle.style.color = 'white';
            }
            
            // 根據頁面類型載入不同的數據
            let dataLoadPromise = Promise.resolve();
            if (page === 'news') {
                dataLoadPromise = loadNewsData();
            } 
            else if (page === 'rank' || page === 'rankS4') {
                dataLoadPromise = loadRankData(page);
            }
            else if (page === 'schedule' || page === 'scheduleS4') {
                dataLoadPromise = loadScheduleData(page);
            }
            
            // 等待數據載入完成後再處理錨點
            dataLoadPromise.then(() => {
                // 如果有錨點，滾動到對應位置
                if (anchor) {
                    const scrollToAnchor = () => {
                        const element = document.getElementById(anchor);
                        if (element) {
                            const headerHeight = 70; // 頂部固定區域的高度
                            const elementRect = element.getBoundingClientRect();
                            const absoluteElementTop = elementRect.top + window.pageYOffset;
                            const middle = window.innerHeight / 4;
                            const scrollPosition = absoluteElementTop - headerHeight - middle;

                            window.scrollTo({
                                top: scrollPosition,
                                behavior: 'smooth'
                            });
                            return true;
                        }
                        return false;
                    };

                    // 嘗試多次滾動，確保元素已經載入
                    let attempts = 0;
                    const maxAttempts = 5;
                    const tryScroll = () => {
                        if (scrollToAnchor() || attempts >= maxAttempts) return;
                        attempts++;
                        setTimeout(tryScroll, 200);
                    };
                    
                    setTimeout(tryScroll, 300);
                }
            });

            // 更新瀏覽器歷史記錄
            if (pushState) {
                const url = anchor ? `#${page}/${anchor}` : `#${page}`;
                history.pushState({ page, anchor }, '', url);
            }
        })
        .catch(error => {
            contentArea.innerHTML = `<div class="error-message">載入失敗: ${error.message}</div>`;
        });
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
        lastWeekContent.innerHTML = lastMatch ? createMatchesHTML(lastMatch, true) : '<p>沒有上週的比賽記錄</p>';
    }
    
    if (upcomingContent) {
        upcomingContent.innerHTML = nextMatch ? createMatchesHTML(nextMatch, false) : '<p>沒有即將到來的比賽</p>';
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
function createMatchesHTML(matchDay, isLastWeek = false) {
    return `
        <div class="match-date">
            <span class="date">${matchDay.date}</span>
            ${isLastWeek ? '<span class="view-result">點擊看詳細賽況 👇</span>' : ''}
        </div>
        <div class="matches-container">
            ${matchDay.games.map(game => {
                if (isLastWeek) {
                    return `
                        <div class="match-item clickable" onclick="showGameResult('${game.game_number}')">
                            <span class="team team-away">${game.team1}</span>
                            <span class="vs">VS</span>
                            <span class="team team-home">${game.team2}</span>
                        </div>
                    `;
                } else {
                    return `
                        <div class="match-item" onclick="showToast('比賽尚未開打喔┌|◎o◎|┘')">
                            <span class="team team-away">${game.team1}</span>
                            <span class="vs">VS</span>
                            <span class="team team-home">${game.team2}</span>
                        </div>
                    `;
                }
            }).join('')}
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

// 添加顯示 toast 的函數
function showToast(message) {
    // 創建 toast 元素
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 添加顯示的 class
    setTimeout(() => toast.classList.add('show'), 10);

    // 1秒後移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 200);
    }, 1000);
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
    // 設置漢堡選單
    setupHamburgerMenu();

    // 設置導航事件
    setupNavigation();

    // 設置標題連結點擊事件
    const titleLink = document.querySelector('.title-link');
    if (titleLink) {
        titleLink.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            if (page) {
                loadContent(page);
            }
        });
    }

    // 處理初始頁面載入
    const hash = window.location.hash;
    if (hash) {
        const [page, anchor] = hash.slice(1).split('/');
        if (page) {
            loadContent(page, anchor, false);
        }
    } else {
        // 如果沒有 hash，載入預設的新聞頁面
        loadContent('news', null, true);
    }
});

// 處理瀏覽器的前進/後退
window.addEventListener('popstate', (event) => {
    if (event.state) {
        loadContent(event.state.page, event.state.anchor, false);
    } else {
        // 如果沒有 state，載入預設的新聞頁面
        loadContent('news', null, false);
    }
});

