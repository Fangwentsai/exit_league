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

                            // 計算最終滾動位置，額外扣除 45px
                            const scrollPosition = Math.max(0, elementPosition - totalFixedHeight - 45);

                            console.log('計算滾動位置:', {
                                elementPosition,
                                totalFixedHeight,
                                extraOffset: 45,
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

// 賽程頁面數據加載
async function loadScheduleData(page) {
    try {
        const currentSeason = page === 'scheduleS4' ? 'SEASON4' : 'SEASON3';
        const config = CONFIG[currentSeason];
        if (!config) throw new Error('找不到配置');

        showLoadingBar();

        const range = 'schedule!A1:F1000';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/${range}?key=${config.API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        
        const data = await response.json();
        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        // 獲取賽季路徑
        const seasonPath = currentSeason === 'SEASON4' ? 'season4' : 'season3';
        
        // 更新表格
        const table = document.getElementById('leagueTable');
        if (!table) return;

        const headers = ['日期/場次', '客隊', '客隊得分', '', '主隊得分', '主隊'];
        
        // 過濾掉空白行
        const filteredData = data.values.slice(1).filter(row => {
            return row && (row[0]?.trim() || row[1]?.trim() || row[5]?.trim());
        });

        let gameCounter = 1;
        
        table.innerHTML = `
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${filteredData.map(row => {
                    // 檢查日期是否已過
                    const matchDate = new Date(row[0].replace('/', '-'));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // 設置為今天凌晨

                    const gameNumber = `g${String(gameCounter).padStart(2, '0')}`;
                    const gameUrl = `game_result/${seasonPath}/${gameNumber}.html`;
                    
                    // 檢查是否有得分數據
                    const hasScores = row[2]?.trim() && row[4]?.trim();
                    
                    // 只有在比賽日期已過且有得分數據時才生成連結
                    const dateCell = (matchDate < today && hasScores)
                        ? `<a href="#" class="match-link" data-game="${gameUrl}">${row[0] || ''}</a>`
                        : row[0] || '';

                    gameCounter++;
                    
                    return `
                        <tr>
                            <td style="background-color: #f0f0f0;">
                                ${dateCell}
                            </td>
                            <td>${row[1] || ''}</td>
                            <td style="text-align: center;">${row[2] || ''}</td>
                            <td style="text-align: center;">VS</td>
                            <td style="text-align: center;">${row[4] || ''}</td>
                            <td>${row[5] || ''}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        `;

        // 只為過去的比賽添加點擊事件
        table.querySelectorAll('.match-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const gameUrl = e.target.getAttribute('data-game');
                showMatchDetails(gameUrl);
            });
        });

        // 設置賽程篩選功能
        setupScheduleFilters();
        hideLoadingBar();

    } catch (error) {
        console.error('載入賽程數據時發生錯誤:', error);
        showScheduleError(error.message);
        hideLoadingBar();
    }
}

// 顯示比賽詳情
function showMatchDetails(gameUrl) {
    const modal = document.createElement('div');
    modal.className = 'match-modal';
    modal.innerHTML = `
        <div class="match-modal-content">
            <span class="match-modal-close">&times;</span>
            <iframe src="${gameUrl}" width="100%" height="600px" frameborder="0"></iframe>
        </div>
    `;

    // 添加模態框樣式
    const style = document.createElement('style');
    style.textContent = `
        .match-modal {
            display: block;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.7);
        }
        .match-modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 800px;
            border-radius: 5px;
            position: relative;
        }
        .match-modal-close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            position: absolute;
            right: 10px;
            top: 5px;
        }
        .match-modal-close:hover {
            color: black;
        }
    `;
    document.head.appendChild(style);

    // 添加模態框到頁面
    document.body.appendChild(modal);

    // 關閉按鈕事件
    const closeBtn = modal.querySelector('.match-modal-close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // 點擊外部關閉
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 設置賽程篩選功能
function setupScheduleFilters() {
    console.log('開始設置賽程篩選功能');
    const teamButtons = document.querySelectorAll('.team-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    let selectedTeams = [];

    console.log('找到的隊伍按鈕數量:', teamButtons.length);
    console.log('取消按鈕是否存在:', !!cancelBtn);

    // 為每個隊伍按鈕添加點擊事件
    teamButtons.forEach(button => {
        const teamName = button.getAttribute('data-team');
        console.log('設置按鈕事件，隊伍名稱:', teamName);
        
        button.addEventListener('click', () => {
            const team = button.getAttribute('data-team');
            const index = selectedTeams.indexOf(team);
            console.log('按鈕被點擊，隊伍:', team);
            console.log('當前選中的隊伍:', selectedTeams);
            console.log('該隊伍在數組中的索引:', index);

            // 切換按鈕選中狀態
            button.classList.toggle('selected');
            console.log('按鈕選中狀態:', button.classList.contains('selected'));

            // 更新選中的隊伍列表
            if (index === -1) {
                selectedTeams.push(team);
                console.log('添加隊伍到選中列表');
            } else {
                selectedTeams.splice(index, 1);
                console.log('從選中列表移除隊伍');
            }
            console.log('更新後的選中隊伍列表:', selectedTeams);

            filterScheduleTable(selectedTeams);
        });
    });

    // 取消按鈕事件
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            console.log('點擊取消按鈕');
            console.log('重置前的選中隊伍:', selectedTeams);
            selectedTeams = [];
            teamButtons.forEach(btn => btn.classList.remove('selected'));
            console.log('已清除所有按鈕的選中狀態');
            console.log('重置後的選中隊伍:', selectedTeams);
            filterScheduleTable(selectedTeams);
        });
    }
}

// 篩選賽程表格
function filterScheduleTable(selectedTeams) {
    console.log('開始篩選賽程表格');
    console.log('選中的隊伍:', selectedTeams);
    
    const table = document.getElementById('leagueTable');
    if (!table) {
        console.error('找不到賽程表格元素');
        return;
    }

    const rows = table.getElementsByTagName('tr');
    console.log('表格總行數:', rows.length);
    
    // 從第二行開始遍歷（跳過表頭）
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.cells || row.cells.length < 6) {
            console.log(`跳過第 ${i} 行：單元格數量不足`);
            continue;
        }

        // 獲取客隊和主隊單元格
        const awayTeamCell = row.cells[1];
        const homeTeamCell = row.cells[5];
        const awayTeam = awayTeamCell.textContent.trim();
        const homeTeam = homeTeamCell.textContent.trim();
        
        console.log(`第 ${i} 行：客隊 "${awayTeam}" vs 主隊 "${homeTeam}"`);

        // 移除之前的高亮效果
        awayTeamCell.classList.remove('highlight-team');
        homeTeamCell.classList.remove('highlight-team');

        if (selectedTeams.length === 0) {
            console.log(`第 ${i} 行：沒有選中隊伍，顯示所有行`);
            row.style.display = '';
        } else {
            const awayMatch = selectedTeams.includes(awayTeam);
            const homeMatch = selectedTeams.includes(homeTeam);
            console.log(`第 ${i} 行：客隊匹配=${awayMatch}, 主隊匹配=${homeMatch}`);
            
            // 添加高亮效果
            if (awayMatch) awayTeamCell.classList.add('highlight-team');
            if (homeMatch) homeTeamCell.classList.add('highlight-team');
            
            if (awayMatch || homeMatch) {
                console.log(`第 ${i} 行：顯示`);
                row.style.display = '';
            } else {
                console.log(`第 ${i} 行：隱藏`);
                row.style.display = 'none';
            }
        }
    }
    console.log('篩選完成');
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
        leagueTable.innerHTML = `<tr><td colspan="6">載入賽程時發生錯誤: ${message}</td></tr>`;
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
        const baseCssPromises = baseCssFiles.map(file => loadCSS(file, true));
        await Promise.all(baseCssPromises);
        console.log('基礎 CSS 加載完成');

        // 立即加載共用圖片
        const commonImagePromises = commonImages.map(file => loadImage(file));
        Promise.all(commonImagePromises).then(() => {
            console.log('共用圖片加載完成');
        });

        // 加載當前頁面需要的 CSS
        if (pageCssMap[page]) {
            const pageCssPromises = pageCssMap[page].map(file => loadCSS(file));
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

        // 預加載其他頁面的資源（低優先級）
        setTimeout(() => {
            Object.entries(pageCssMap).forEach(([key, files]) => {
                if (key !== page) {
                    files.forEach(file => {
                        loadCSS(file, false, true);
                    });
                }
            });
        }, 2000);

    } catch (error) {
        console.error('資源加載過程中發生錯誤:', error);
    }
}

// 加載 CSS 文件
function loadCSS(file, isImportant = false, isPreload = false) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = isPreload ? 'preload' : 'stylesheet';
        // 移除域名，使用相對路徑
        link.href = file.startsWith('/') ? file : `/${file}`;
        if (isPreload) {
            link.as = 'style';
        }
        if (isImportant) {
            link.setAttribute('importance', 'high');
        }
        link.onload = () => {
            console.log(`CSS ${isPreload ? '預加載' : '載入'}成功: ${file}`);
            if (isPreload) {
                link.rel = 'stylesheet';
            }
            resolve();
        };
        link.onerror = () => {
            console.warn(`CSS 載入失敗: ${file}`);
            resolve(); // 即使失敗也繼續
        };
        document.head.appendChild(link);
    });
}

// 加載圖片
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `/${file}`;
        img.onload = () => {
            console.log(`圖片載入成功: ${file}`);
            resolve();
        };
        img.onerror = () => {
            console.warn(`圖片載入失敗: ${file}`);
            resolve();
        };
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 先預加載資源
    await preloadResources();
    
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

