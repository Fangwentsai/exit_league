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
                // 關閉側邊欄和所有子選單
                closeSidebar();
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
                // 關閉側邊欄和所有子選單
                closeSidebar();
            }
        });
    });
}

// 關閉側邊欄和所有子選單的函數
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const hamburger = document.querySelector('.hamburger-btn');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
    
    // 關閉所有子選單
    document.querySelectorAll('.sidebar-submenu').forEach(menu => {
        menu.classList.remove('active');
        if (menu.previousElementSibling) {
            menu.previousElementSibling.classList.remove('active');
        }
    });
}

// 載入內容
async function loadContent(page, anchor = null, pushState = true) {
    console.log('loadContent 開始:', { page, anchor, pushState });
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    // 顯示載入中
    contentArea.innerHTML = '<div class="loading">載入中...</div>';
    
    // 移除所有預加載的CSS樣式表
    document.querySelectorAll('link[data-preload="true"]').forEach(link => {
        document.head.removeChild(link);
    });

    // 預加載當前頁面所需資源
    await preloadResources(page);

    // 構建頁面路徑
    const pagePath = `pages/${page}.html`;
    console.log('準備載入頁面:', pagePath);

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
            console.log('頁面內容已載入');
            
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
                console.log('數據載入完成，準備處理錨點');
                // 如果有錨點，滾動到對應位置
                if (anchor) {
                    console.log('開始處理錨點:', anchor);
                    const scrollToAnchor = () => {
                        const element = document.getElementById(anchor);
                        console.log('尋找錨點元素:', { 
                            anchor, 
                            elementFound: !!element,
                            elementTop: element?.offsetTop,
                            elementId: element?.id,
                            elementHTML: element?.outerHTML
                        });
                        
                        if (element) {
                            // 只計算真正固定在頂部的元素
                            const fixedElements = Array.from(document.querySelectorAll('header, nav, .fixed-top')).filter(el => 
                                window.getComputedStyle(el).position === 'fixed' && 
                                window.getComputedStyle(el).top === '0px'
                            );
                            
                            // 計算固定元素的總高度
                            const totalFixedHeight = fixedElements.reduce((total, el) => {
                                const rect = el.getBoundingClientRect();
                                return total + (rect.height || 0);
                            }, 0);

                            // 獲取元素的絕對位置
                            let elementPosition = 0;
                            let currentElement = element;
                            
                            while (currentElement) {
                                elementPosition += currentElement.offsetTop;
                                currentElement = currentElement.offsetParent;
                            }

                            // 計算最終滾動位置，額外扣除 65px
                            const scrollPosition = Math.max(0, elementPosition - totalFixedHeight - 65);

                            console.log('計算滾動位置:', {
                                elementPosition,
                                totalFixedHeight,
                                extraOffset: 65,
                                finalScrollPosition: scrollPosition,
                                fixedElements: fixedElements.length,
                                fixedElementsList: fixedElements.map(el => el.tagName),
                                windowScrollY: window.scrollY,
                                windowInnerHeight: window.innerHeight
                            });

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
                    const maxAttempts = 10;
                    const tryScroll = () => {
                        console.log(`嘗試滾動 第 ${attempts + 1} 次`);
                        if (scrollToAnchor() || attempts >= maxAttempts) {
                            console.log(attempts >= maxAttempts ? '達到最大嘗試次數' : '成功找到並滾動到錨點');
                            return;
                        }
                        attempts++;
                        setTimeout(tryScroll, 100);
                    };
                    
                    setTimeout(tryScroll, 100);
                }
            });

            // 更新瀏覽器歷史記錄
            if (pushState) {
                const url = anchor ? `#${page}/${anchor}` : `#${page}`;
                console.log('更新瀏覽器歷史:', url);
                history.pushState({ page, anchor }, '', url);
            }
        })
        .catch(error => {
            console.error('載入頁面時發生錯誤:', error);
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

// ========== Google Sheets 新聞頁面數據加載與渲染 ========== //

// 解析日期，格式為 "MM/DD"，添加當前年份
function parseDate(dateStr) {
    if (!dateStr) return null;
    let parts;
    if (dateStr.includes('/')) {
        parts = dateStr.split('/');
    } else if (dateStr.includes('-')) {
        parts = dateStr.split('-');
    } else if (dateStr.includes('.')) {
        parts = dateStr.split('.');
    } else {
        console.error('無法解析日期格式:', dateStr);
        return null;
    }
    if (parts.length < 2) {
        console.error('日期格式不完整:', dateStr);
        return null;
    }
    let month, day;
    if (parts.length === 2) {
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
    } else if (parts.length === 3) {
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
    }
    if (isNaN(month) || isNaN(day)) {
        console.error('日期解析失敗:', dateStr);
        return null;
    }
    const year = new Date().getFullYear();
    return new Date(year, month, day);
}

function generateMatchesHTML(matches) {
    if (matches.length === 0) {
        return '<p>沒有比賽數據</p>';
    }
    
    // 生成唯一的ID，用於事件綁定
    const uniqueId = 'matches-' + Math.random().toString(36).substr(2, 9);
    
    const matchesByDate = {};
    for (const match of matches) {
        if (!matchesByDate[match.date]) {
            matchesByDate[match.date] = [];
        }
        matchesByDate[match.date].push(match);
    }
    
    let html = `<div id="${uniqueId}">`;
    for (const date in matchesByDate) {
        html += `
            <div class="match-date">
                <span class="date">${date}</span>
            </div>
            <div class="matches-container">
        `;
        for (const match of matchesByDate[date]) {
            // 判斷比賽是否已完成（有分數）
            const hasScores = match.score1 || match.score2;
            const gameNumber = match.gameCode.replace(/^[Gg]/, '');
            const gameResultPath = `game_result/season4/g${gameNumber}.html`;
            
            // 如果有分數，添加一個 data 屬性來存儲游戲路徑，用於之後的事件綁定
            const dataAttr = hasScores ? `data-game-url="${gameResultPath}"` : '';
            const clickableClass = hasScores ? 'clickable-match' : '';
            
            html += `
                <div class="match ${clickableClass}" ${dataAttr}>
                    <div class="match-header">
                        <span class="match-code">${match.gameCode}</span>
                        <span class="match-venue">${match.venue || ''}</span>
                    </div>
                    <div class="match-teams">
                        <div class="team team1">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1 || ''}</div>
                        </div>
                        <div class="vs">vs</div>
                        <div class="team team2">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2 || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    html += `</div>`;
    
    // 添加特定於比賽顯示的CSS樣式
    if (!document.getElementById('match-style')) {
        const style = document.createElement('style');
        style.id = 'match-style';
        style.textContent = `
            .match {
                background-color: #f5f5f5;
                border-radius: 8px;
                margin-bottom: 10px;
                padding: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .clickable-match {
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .clickable-match:hover {
                background-color: #e9e9e9;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .match-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 14px;
                color: #666;
            }
            
            .match-code {
                font-weight: bold;
                color: #333;
            }
            
            .match-venue {
                font-style: italic;
            }
            
            .match-teams {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                padding: 0 5px;
            }
            
            .team {
                display: flex;
                flex-direction: column;
                width: 42%;
            }
            
            .team1 {
                align-items: flex-start;
                text-align: left;
            }
            
            .team2 {
                align-items: flex-end;
                text-align: right;
            }
            
            .team-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 2px;
            }
            
            .score {
                font-size: 22px;
                font-weight: bold;
                color: #c00;
                line-height: 1;
            }
            
            .vs {
                align-self: center;
                font-weight: bold;
                color: #666;
                padding: 0 5px;
                flex-shrink: 0;
                font-size: 14px;
                margin-top: 8px;
            }
            
            .match-date {
                margin-top: 15px;
                margin-bottom: 8px;
                position: relative;
            }
            
            .date {
                font-weight: bold;
                color: #333;
                background-color: #f0f0f0;
                padding: 3px 10px;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 使用 setTimeout 使事件在 HTML 插入 DOM 後綁定
    setTimeout(() => {
        const container = document.getElementById(uniqueId);
        if (container) {
            // 為所有可點擊的比賽添加事件
            const clickableMatches = container.querySelectorAll('.clickable-match');
            clickableMatches.forEach(match => {
                match.addEventListener('click', function() {
                    const gameUrl = this.getAttribute('data-game-url');
                    if (gameUrl) {
                        showMatchDetails(gameUrl);
                    }
                });
            });
        }
    }, 0);
    
    return html;
}

function parseScheduleData(values) {
    console.log('開始解析 schedule 工作表數據');
    console.log('數據行數:', values.length);
    const result = [];
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length < 7) continue;
        const gameCode = row[0];
        if (gameCode && typeof gameCode === 'string' && gameCode.startsWith('G') && row[1]) {
            console.log(`處理比賽: ${gameCode} - ${row[1]}`);
            result.push({
                gameCode: gameCode,
                date: row[1] || '',
                team1: row[2] || '',
                score1: row[3] || '',
                vs: row[4] || 'vs',
                score2: row[5] || '',
                team2: row[6] || '',
                venue: row[7] || ''
            });
        }
    }
    console.log(`共解析出 ${result.length} 場比賽`);
    return result;
}

function displayMatches(matches) {
    console.log('開始處理並顯示比賽數據，總數據條數:', matches.length);
    const today = new Date();
    console.log('當前日期:', today.toISOString().split('T')[0]);
    const lastWeekMatches = [];
    const upcomingMatches = [];
    for (const match of matches) {
        if (!match.date) {
            console.log('跳過沒有日期的比賽:', match);
            continue;
        }
        const matchDate = parseDate(match.date);
        if (!matchDate) {
            console.log('無法解析日期:', match.date, '跳過此比賽:', match);
            continue;
        }
        console.log('比賽日期:', match.date, '解析為:', matchDate.toISOString().split('T')[0]);
        const diffTime = matchDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log('比賽與今天相差天數:', diffDays);
        
        // 只顯示最近 7 天內的比賽作為上週戰況
        if (diffDays < 0 && diffDays >= -7) {
            console.log('分類為上週比賽:', match);
            lastWeekMatches.push(match);
        } 
        // 只顯示未來 7 天的比賽作為近期比賽
        else if (diffDays >= 0 && diffDays <= 7) {
            console.log('分類為近期比賽:', match);
            upcomingMatches.push(match);
        } else {
            console.log('不在顯示範圍內的比賽:', match);
        }
    }
    
    // 按日期排序，確保最近的日期排在前面
    lastWeekMatches.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA; // 降序排列，最近的日期在前
    });
    
    // 按日期排序，確保最近的日期排在前面
    upcomingMatches.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB; // 升序排列，最近的日期在前
    });
    
    console.log('上週比賽總數:', lastWeekMatches.length);
    console.log('近期比賽總數:', upcomingMatches.length);
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    if (lastWeekContent) {
        if (lastWeekMatches.length > 0) {
            lastWeekContent.innerHTML = generateMatchesHTML(lastWeekMatches);
            console.log('上週戰況已更新');
        } else {
            lastWeekContent.innerHTML = '<p>無上週比賽數據</p>';
            console.log('無上週比賽數據');
        }
    } else {
        console.error('找不到上週戰況容器元素');
    }
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    if (upcomingContent) {
        if (upcomingMatches.length > 0) {
            upcomingContent.innerHTML = generateMatchesHTML(upcomingMatches);
            console.log('近期比賽已更新');
        } else {
            upcomingContent.innerHTML = '<p>無近期比賽數據</p>';
            console.log('無近期比賽數據');
        }
    } else {
        console.error('找不到近期比賽容器元素');
    }
}

async function loadMatches() {
    try {
        console.log('開始從 Google Sheets 載入比賽數據...');
        const sheetId = CONFIG.SEASON4.SHEET_ID;
        const apiKey = CONFIG.SEASON4.API_KEY;
        console.log('使用的 Google Sheets ID:', sheetId);
        console.log('使用的 API Key:', apiKey);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/schedule!A2:H57?key=${apiKey}`;
        console.log('請求的 URL:', url);
        const response = await fetch(url);
        console.log('fetch 響應狀態:', response.status);
        if (!response.ok) {
            throw new Error(`Google Sheets API 錯誤: ${response.status}`);
        }
        const jsonData = await response.json();
        console.log('獲取到的 JSON 數據:', jsonData);
        if (!jsonData.values || jsonData.values.length === 0) {
            throw new Error('Google Sheets 數據為空');
        }
        const data = parseScheduleData(jsonData.values);
        console.log('解析後的比賽數據:', data);
        if (data.length === 0) {
            throw new Error('沒有有效的比賽數據');
        }
        displayMatches(data);
    } catch (error) {
        console.error('載入比賽時發生錯誤:', error);
        const lastWeekContent = document.getElementById('lastWeekMatchesContent');
        const upcomingContent = document.getElementById('upcomingMatchesContent');
        if (lastWeekContent) {
            lastWeekContent.innerHTML = `<p>載入數據時發生錯誤: ${error.message}</p>`;
        }
        if (upcomingContent) {
            upcomingContent.innerHTML = `<p>載入數據時發生錯誤: ${error.message}</p>`;
        }
    }
}

// 修改 loadNewsData，載入頁面時自動抓取 Google Sheets
async function loadNewsData() {
    try {
        await loadMatches();
    } catch (error) {
        showNewsError(error.message);
    }
}

// 更新新聞內容
function updateNewsContent(lastMatch, nextMatch) {
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    
    if (lastWeekContent) {
        if (lastMatch) {
            lastWeekContent.innerHTML = createMatchesHTML(lastMatch, true);
        } else {
            lastWeekContent.innerHTML = '<p>沒有上週的比賽記錄</p>';
        }
    }
    
    if (upcomingContent) {
        if (nextMatch) {
            upcomingContent.innerHTML = createMatchesHTML(nextMatch);
        } else {
            upcomingContent.innerHTML = '<p>目前沒有安排的比賽</p>';
        }
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

        // 更新個人排名表格並設置功能
        const personalRankings = personalData.values.slice(1).map(row => ({
            team: row[0] || '',
            name: row[1] || '',
            wins01: parseFloat(row[2]) || 0,
            rate01: parseFloat(row[3]) || 0,
            winsCR: parseFloat(row[4]) || 0,
            rateCR: parseFloat(row[5]) || 0,
            totalWins: parseFloat(row[6]) || 0,
            totalRate: parseFloat(row[7]) || 0,
            firstRate: parseFloat(row[8]) || 0
        }));

        // 初始化個人排名相關功能
        initializePersonalRankings(personalRankings);

    } catch (error) {
        console.error('載入排名數據時發生錯誤:', error);
        showRankError(error.message);
    }
}

// 初始化個人排名功能
function initializePersonalRankings(rankings) {
    let currentData = [...rankings];
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentSort = {
        column: 'totalWins',
        ascending: false
    };

    // 更新個人排名表格
    function updatePersonalTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = currentData.slice(start, end);
        const totalPages = Math.ceil(currentData.length / rowsPerPage);
        
        // 更新表格內容
        const tableBody = document.getElementById('personalTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = pageData.map((row, index) => `
            <tr>
                <td>${start + index + 1}</td>
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

        // 更新分頁信息
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.innerHTML = `第 ${currentPage} 頁，共 ${totalPages} 頁`;
        }

        // 更新分頁按鈕狀態
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        if (prevButton) prevButton.disabled = currentPage === 1;
        if (nextButton) nextButton.disabled = currentPage === totalPages;
    }

    // 設置排序功能
    function setupSorting() {
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                if (currentSort.column === column) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.column = column;
                    currentSort.ascending = true;
                }

                // 移除所有排序指示器
                headers.forEach(h => h.classList.remove('asc', 'desc'));
                header.classList.add(currentSort.ascending ? 'asc' : 'desc');

                // 排序數據
                currentData.sort((a, b) => {
                    let aValue = a[column];
                    let bValue = b[column];
                    
                    if (typeof aValue === 'string' && aValue.includes('%')) {
                        aValue = parseFloat(aValue);
                        bValue = parseFloat(bValue);
                    }
                    
                    if (currentSort.ascending) {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });

                currentPage = 1;
                updatePersonalTable();
            });
        });
    }

    // 設置篩選功能
    function setupFilters() {
        const teamFilter = document.getElementById('teamFilter');
        const nameSearch = document.getElementById('nameSearch');
        const resetButton = document.getElementById('resetFilter');

        if (!teamFilter || !nameSearch || !resetButton) return;

        // 獲取唯一的隊伍列表
        const uniqueTeams = [...new Set(rankings.map(row => row.team))]
            .filter(team => team)
            .sort();

        // 添加隊伍選項
        teamFilter.innerHTML = '<option value="">所有隊伍</option>' +
            uniqueTeams.map(team => `<option value="${team}">${team}</option>`).join('');

        function filterData() {
            const teamValue = teamFilter.value;
            const nameValue = nameSearch.value.toLowerCase();

            currentData = rankings.filter(row => {
                const teamMatch = !teamValue || row.team === teamValue;
                const nameMatch = !nameValue || row.name.toLowerCase().includes(nameValue);
                return teamMatch && nameMatch;
            });

            currentPage = 1;
            updatePersonalTable();
        }

        // 添加事件監聽器
        teamFilter.addEventListener('change', filterData);
        nameSearch.addEventListener('input', filterData);
        resetButton.addEventListener('click', () => {
            teamFilter.value = '';
            nameSearch.value = '';
            currentData = [...rankings];
            currentPage = 1;
            updatePersonalTable();
        });
    }

    // 設置分頁功能
    function setupPagination() {
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    updatePersonalTable();
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(currentData.length / rowsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    updatePersonalTable();
                }
            });
        }
    }

    // 初始化所有功能
    setupSorting();
    setupFilters();
    setupPagination();
    updatePersonalTable();
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

// 載入賽程數據
async function loadScheduleData(page) {
    console.log('開始載入賽程數據:', page);
    console.log('當前頁面:', window.location.href);
    let season = '';
    
    // 檢查是否有明確指定的賽季覆蓋設定
    if (typeof seasonOverride !== 'undefined') {
        console.log('使用明確指定的賽季:', seasonOverride);
        season = seasonOverride;
    } else {
        // 根據頁面確定要使用的配置
        if (page === 'scheduleS4') {
            season = 's4';
        } else if (page === 'schedule') {  // schedule.html 對應第三屆
            season = 's3';
        } else {
            console.error('未知的賽程頁面:', page);
            return;
        }
    }

    // 構建數據文件路徑
    const dataFile = `data/schedule_${season}.json`;
    console.log('嘗試載入數據文件:', dataFile);

    try {
        showLoadingBar();
        console.log('開始發送請求到:', dataFile);
        const response = await fetch(dataFile);
        console.log('收到響應:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('收到的數據長度:', text.length);
        
        try {
            // 清理文本內容
            const cleanText = text
                .replace(/^\uFEFF/, '')
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\r\n/g, '\n')
                .trim();
            
            // 驗證 JSON 格式
            try {
                validateScheduleData(cleanText);
                console.log('JSON 格式驗證通過');
            } catch (validationError) {
                console.error('JSON 格式驗證失敗:', validationError.message);
            }
            
            const data = JSON.parse(cleanText);
            console.log('JSON 解析成功');
            
            // 獲取當前日期
            const currentDate = new Date();
            
            // 生成表格內容
            let tableContent = '';
            if (!data.schedule || !Array.isArray(data.schedule)) {
                throw new Error('無效的數據格式：缺少 schedule 數組');
            }
            
            data.schedule.forEach((daySchedule) => {
                if (!daySchedule.games || !Array.isArray(daySchedule.games)) {
                    console.error('無效的比賽日數據:', daySchedule);
                    return;
                }
                
                daySchedule.games.forEach((match, index) => {
                    const matchDate = new Date(daySchedule.date);
                    const hasScores = match.team1.includes(" ") && match.team2.includes(" ");
                    const isPastMatch = matchDate < currentDate;
                    
                    // 使用 game_number 而不是索引
                    const gameNumber = match.game_number.substring(1); // 移除 'g' 前綴
                    let gameResultPath = '';
                    
                    // 根據賽季設定正確的路徑
                    if (season === 's4') {
                        gameResultPath = `game_result/season4/g${gameNumber}.html`;
                    } else if (season === 's3') {
                        gameResultPath = `game_result/season3/g${gameNumber}.html`;
                    }

                    // 生成日期單元格的HTML，添加點擊事件
                    let dateHtml = '';
                    if (isPastMatch && hasScores) {
                        // 為過去的比賽添加可點擊的日期，顯示比賽結果
                        dateHtml = `<span class="clickable-date" data-game-url="${gameResultPath}">${daySchedule.date}</span>`;
                    } else {
                        dateHtml = daySchedule.date;
                    }

                    // 從 team1 和 team2 中提取分數（如果有的話）
                    let team1Parts = match.team1.split(" ");
                    let team2Parts = match.team2.split(" ");
                    let team1Score = team1Parts.length > 1 ? team1Parts[team1Parts.length - 1] : null;
                    let team1Name = team1Parts.length > 1 ? team1Parts.slice(0, -1).join(" ") : match.team1;
                    let team2Score = team2Parts.length > 1 ? team2Parts[0] : null;
                    let team2Name = team2Parts.length > 1 ? team2Parts.slice(1).join(" ") : match.team2;
                    
                    // 移除主隊名稱後的"(主)"字樣
                    team1Name = team1Name.replace(/\(主\)$/, '').trim();
                    team2Name = team2Name.replace(/\(主\)$/, '').trim();

                    // 準備比分單元格的內容
                    let scoreContent = hasScores 
                        ? `<span class="score">${team1Score}</span><span class="score-separator">-</span><span class="score">${team2Score}</span>` 
                        : '-';

                    // 生成表格行 - 使用更優化的布局
                    tableContent += `
                        <tr id="match-${gameNumber}" class="${isPastMatch && hasScores ? 'clickable-match' : ''}">
                            <td class="date-cell">${dateHtml}</td>
                            <td class="team-cell">${team1Name}</td>
                            <td class="score-cell">${scoreContent}</td>
                            <td class="team-cell">${team2Name}</td>
                        </tr>
                    `;
                });
            });
            
            // 更新表格內容
            const tableBody = document.querySelector('.schedule-table tbody');
            if (tableBody) {
                tableBody.innerHTML = tableContent;
                console.log('表格內容已更新');
                
                // 添加日期單元格的點擊事件
                document.querySelectorAll('.clickable-date').forEach(dateElement => {
                    dateElement.addEventListener('click', function(e) {
                        e.stopPropagation(); // 防止事件冒泡到tr
                        const gameUrl = this.getAttribute('data-game-url');
                        console.log('點擊日期，顯示比賽詳情:', gameUrl);
                        if (gameUrl) {
                            showMatchDetails(gameUrl);
                        }
                    });
                });
                
                // 設置表格行點擊事件
                setupMatchTableRows();
                
                // 重要: 重新初始化篩選功能
                console.log('關鍵: 表格加載完成，重新初始化篩選功能');
                
                // 確保清除所有按鈕的選中狀態
                document.querySelectorAll('.team-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // 一個簡單的延遲，確保DOM完全更新
                setTimeout(() => {
                    // 重新設置篩選功能
                    if (typeof setupScheduleFilters === 'function') {
                        console.log('重新初始化篩選功能');
                        setupScheduleFilters();
                    } else {
                        console.error('無法找到setupScheduleFilters函數');
                    }
                }, 100);
            } else {
                console.error('找不到表格元素 .schedule-table tbody');
            }
            
            hideLoadingBar();
            console.log('賽程數據載入完成');
        } catch (error) {
            console.error('載入賽程數據時發生錯誤:', error);
            const tableBody = document.querySelector('.schedule-table tbody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4">載入數據時發生錯誤</td></tr>';
            }
            hideLoadingBar();
        }
    } catch (error) {
        console.error('載入賽程數據時發生錯誤:', error);
        const tableBody = document.querySelector('.schedule-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4">載入數據時發生錯誤</td></tr>';
        }
        hideLoadingBar();
    }
}

// 顯示比賽詳情
function showMatchDetails(gameUrl) {
    console.log('嘗試顯示比賽詳情:', gameUrl);
    
    // 如果已經存在模態框，先移除
    const existingModal = document.querySelector('.match-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // 創建模態框容器
    const modal = document.createElement('div');
    modal.className = 'match-modal';
    
    // 創建模態框內容
    const modalContent = document.createElement('div');
    modalContent.className = 'match-modal-content';
    
    // 添加關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', function() {
        closeMatchModal(modal);
    });
    
    // 創建iframe來加載比賽結果頁面
    const iframe = document.createElement('iframe');
    iframe.className = 'match-iframe';
    iframe.src = gameUrl;
    
    // 組裝模態框
    modalContent.appendChild(closeButton);
    modalContent.appendChild(iframe);
    modal.appendChild(modalContent);
    
    // 添加到頁面
    document.body.appendChild(modal);
    
    // 使用setTimeout讓DOM有時間渲染，然後再添加顯示類
    setTimeout(() => {
        modal.classList.add('visible');
    }, 10);
    
    // 添加點擊模態框背景關閉的功能
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMatchModal(modal);
        }
    });
    
    // 添加ESC鍵關閉功能
    const handleKeyDown = function(e) {
        if (e.key === 'Escape') {
            if (document.body.contains(modal)) {
                closeMatchModal(modal);
            }
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
}

// 關閉模態框
function closeMatchModal(modal) {
    modal.classList.remove('visible');
    
    // 等待動畫完成後再移除元素
    setTimeout(() => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    }, 300);
}

// 設置賽程篩選功能
function setupScheduleFilters() {
    console.log('設置賽程篩選功能');
    const teamButtons = document.querySelectorAll('.team-btn');
    console.log('找到篩選按鈕數量:', teamButtons.length);
    
    if (teamButtons.length === 0) {
        console.warn('警告: 未找到任何篩選按鈕，請確認頁面加載正確');
        return;
    }
    
    // 記錄找到的所有按鈕信息
    teamButtons.forEach((btn, idx) => {
        const team = btn.getAttribute('data-team');
        const hasClass = btn.classList.contains('selected');
        console.log(`按鈕 ${idx}: team=${team}, 是否選中=${hasClass}, 內容文本="${btn.textContent}"`);
    });
    
    // 創建一個新的Set來存儲選中的隊伍
    // 確保每次重新加載頁面時都重置篩選狀態
    const selectedTeams = new Set();
    
    // 為每個按鈕添加點擊事件
    teamButtons.forEach(button => {
        const team = button.getAttribute('data-team');
        
        // 移除現有事件(如果有的話)
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // 添加新的事件監聽器
        newButton.addEventListener('click', function() {
            const team = this.getAttribute('data-team');
            console.log(`點擊按鈕: ${team}`);
            
            if (this.classList.contains('selected')) {
                // 如果已選中，則取消選中
                console.log(`取消選中: ${team}`);
                this.classList.remove('selected');
                selectedTeams.delete(team);
            } else {
                // 如果未選中，則選中
                console.log(`選中: ${team}`);
                this.classList.add('selected');
                selectedTeams.add(team);
            }
            
            console.log('當前選中的隊伍:', Array.from(selectedTeams));
            
            // 篩選表格
            debugFilterTable(Array.from(selectedTeams));
        });
    });
    
    console.log('賽程篩選功能設置完成');
}

// 測試用的調試篩選功能
function debugFilterTable(selectedTeams) {
    console.log('調試篩選表格，選中的隊伍:', selectedTeams);
    
    const tbody = document.querySelector('.schedule-table tbody');
    if (!tbody) {
        console.error('未找到表格主體');
        return;
    }
    
    const rows = tbody.querySelectorAll('tr');
    console.log(`找到表格行: ${rows.length} 行`);
    
    // 如果沒有選中任何隊伍，顯示所有行
    if (selectedTeams.length === 0) {
        console.log('沒有選中任何隊伍，顯示所有行');
        rows.forEach(row => row.style.display = '');
        return;
    }
    
    // 篩選行
    rows.forEach((row, idx) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) {
            console.log(`行 ${idx+1} 單元格數量不足: ${cells.length}`);
            return;
        }
        
        // 單元格索引: 1=客隊, 3=主隊
        const awayTeam = cells[1].textContent.trim();
        const homeTeam = cells[3].textContent.trim();
        
        console.log(`行 ${idx+1}: 客隊="${awayTeam}", 主隊="${homeTeam}"`);
        
        // 檢查是否包含選中的隊伍
        const matchFound = selectedTeams.some(team => 
            awayTeam.includes(team) || homeTeam.includes(team)
        );
        
        console.log(`行 ${idx+1} 匹配結果: ${matchFound}`);
        
        // 顯示或隱藏行
        row.style.display = matchFound ? '' : 'none';
        
        // 高亮匹配的隊伍
        if (matchFound) {
            // 檢查客隊
            if (selectedTeams.some(team => awayTeam.includes(team))) {
                cells[1].classList.add('highlight-team');
            } else {
                cells[1].classList.remove('highlight-team');
            }
            
            // 檢查主隊
            if (selectedTeams.some(team => homeTeam.includes(team))) {
                cells[3].classList.add('highlight-team');
            } else {
                cells[3].classList.remove('highlight-team');
            }
        }
    });
    
    console.log('篩選完成');
}

// 使用調試篩選函數替換原有的篩選函數
function filterScheduleTable(selectedTeams) {
    debugFilterTable(selectedTeams);
}

// 設置賽程表格行的點擊事件處理
function setupMatchTableRows() {
    // 為有比賽結果的行添加點擊處理
    document.querySelectorAll('tr.clickable-match').forEach((row, index) => {
        // 為行添加索引屬性，用於交錯動畫
        row.style.setProperty('--row-index', index + 1);
        
        row.addEventListener('click', function() {
            const dateCell = this.querySelector('.date-cell');
            if (dateCell) {
                const clickableDate = dateCell.querySelector('.clickable-date');
                if (clickableDate) {
                    const gameUrl = clickableDate.getAttribute('data-game-url');
                    if (gameUrl) {
                        console.log('點擊行，顯示比賽詳情:', gameUrl);
                        showMatchDetails(gameUrl);
                    }
                }
            }
        });
    });
}

// 創建比賽 HTML
function createMatchesHTML(matchDay, isLastWeek = false) {
    return `
        <div class="match-date">
            <span class="date">${matchDay.date}</span>
            ${isLastWeek ? '<span class="view-result">點擊下排看詳細賽況 👇</span>' : ''}
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
        leagueTable.innerHTML = `<tr><td colspan="4">載入賽程時發生錯誤: ${message}</td></tr>`;
    }
}

// 預加載資源
async function preloadResources(page = 'news') {
    console.log('開始預加載資源，當前頁面:', page);
    
    // 基礎 CSS 文件（立即加載）
    const baseCssFiles = [
        'styles/index.css'
    ];

    // 頁面特定的 CSS 文件（按需加載）
    const pageCssMap = {
        'news': ['styles/news.css'],
        'rank': ['styles/rank.css'],
        'rankS4': ['styles/rank.css'],
        'schedule': ['styles/schedule.css'],
        'scheduleS4': ['styles/schedule.css'],
        'shops': ['styles/shops.css']
    };

    // 共用圖片（立即加載）
    const commonImages = [
        'images/banner.png'
    ];

    // 頁面特定的圖片（按需加載）
    const pageImageMap = {
        'shops': [
            'images/fb-icon.png',
            'images/ig-icon.png',
            'images/phone-icon.png'
        ]
    };

    try {
        // 立即加載基礎 CSS
        const baseCssPromises = baseCssFiles.map(file => loadCSS(file, true, false));
        await Promise.all(baseCssPromises);
        console.log('基礎 CSS 加載完成');

        // 立即加載共用圖片
        const commonImagePromises = commonImages.map(file => loadImage(file));
        Promise.all(commonImagePromises).then(() => {
            console.log('共用圖片加載完成');
        });

        // 加載當前頁面需要的 CSS - 使用normal模式
        if (pageCssMap[page]) {
            const pageCssPromises = pageCssMap[page].map(file => loadCSS(file, true, false));
            Promise.all(pageCssPromises).then(() => {
                console.log(`${page} 頁面 CSS 加載完成`);
            });
        }

        // 加載當前頁面需要的圖片
        if (pageImageMap[page]) {
            const pageImagePromises = pageImageMap[page].map(file => loadImage(file));
            Promise.all(pageImagePromises).then(() => {
                console.log(`${page} 頁面圖片加載完成`);
            });
        }

        // 預加載其他頁面的資源（低優先級）- 使用真正的preload模式
        if (window.cssPreloadingDone !== true) {
            setTimeout(() => {
                // 設置標記，避免重複預加載
                window.cssPreloadingDone = true;
                
                console.log('開始預加載其他頁面CSS資源');
                Object.entries(pageCssMap).forEach(([key, files]) => {
                    if (key !== page) {
                        files.forEach(file => {
                            // 使用預加載模式，但不會自動應用到頁面
                            loadCSS(file, false, true);
                        });
                    }
                });
            }, 2000); // 縮短至2秒，資源加載更快
        }

    } catch (error) {
        console.error('資源加載過程中發生錯誤:', error);
    }
}

// 加載 CSS 文件
function loadCSS(file, isImportant = false, isPreload = false) {
    return new Promise((resolve, reject) => {
        // 檢查是否已經加載過此CSS文件
        const existingLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
        const isAlreadyLoaded = existingLinks.some(link => link.href.includes(file));
        
        // 如果已經加載過，只有在非預加載模式時才應用該CSS
        if (isAlreadyLoaded) {
            // 檢查是否為預加載模式的CSS需要轉為常規應用模式
            if (!isPreload) {
                const preloadLink = existingLinks.find(link => 
                    link.href.includes(file) && 
                    link.rel === 'preload' && 
                    link.getAttribute('as') === 'style'
                );
                
                // 如果找到預加載的鏈接，將其轉換為stylesheet
                if (preloadLink) {
                    console.log(`將預加載的CSS轉為應用: ${file}`);
                    // 創建新的stylesheet鏈接而不是修改原有的
                    // 這樣可以避免閃爍和樣式突變問題
                    const styleLink = document.createElement('link');
                    styleLink.rel = 'stylesheet';
                    styleLink.href = preloadLink.href;
                    if (isImportant) {
                        styleLink.setAttribute('importance', 'high');
                    }
                    
                    styleLink.onload = () => {
                        console.log(`