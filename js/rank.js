// 【已修改】
// 你的網站是一個單頁應用 (SPA)，頁面路徑 (pathname) 始終是 "/"
// 我們必須改用 URL 的 "錨點" (hash) 來判斷要載入哪個賽季

// 獲取當前頁面的 "錨點" (hash), 例如 "#rankS5"
const currentHash = window.location.hash; 

// 從 hash 中提取 "page" 名稱 (移除 '#')，例如 "rankS5"
let pageIdentifier = currentHash.substring(1);

// 如果是獨立頁面（如 rankS6.html），從路徑名判斷
if (!pageIdentifier && window.location.pathname) {
    const pathname = window.location.pathname;
    if (pathname.includes('rankS6') || pathname.includes('ranks6')) {
        pageIdentifier = 'rankS6';
    } else if (pathname.includes('rankS5') || pathname.includes('ranks5')) {
        pageIdentifier = 'rankS5';
    } else if (pathname.includes('rankS4') || pathname.includes('ranks4')) {
        pageIdentifier = 'rankS4';
    } else if (pathname.includes('rank') && !pathname.includes('rankS')) {
        pageIdentifier = 'rank';
    }
}

console.log('當前路徑 (Path):', window.location.pathname);
console.log('當前錨點 (Hash):', currentHash);
console.log('解析到的頁面 (pageIdentifier):', pageIdentifier); 

// 【重要】
// 你的 loadRankings 函式中也需要 fileName 變數
// 我們就把 pageIdentifier 賦值給它
const fileName = pageIdentifier; 

// 從 seasonOverride、頁面名稱或網址判斷賽季（規則統一在 config/config.js）
let seasonNumber = resolveSeasonNumber({
    page: fileName,
    override: (typeof window !== 'undefined') ? window.seasonOverride : undefined,
    path: fileName
});

if (!seasonNumber && fileName === '' && window.location.pathname === '/') {
    // 首頁且沒有 hash 時，預設顯示當季
    seasonNumber = CURRENT_SEASON;
    console.log('Hash 為空，預設為當季');
}

const currentSeason = `SEASON${seasonNumber || 3}`; // 都判斷不出來時退回第三屆
const seasonMeta = getSeason(seasonNumber || 3);
console.log('檢測到賽季:', seasonMeta.label);

// 從 CONFIG 對象中獲取對應賽季的配置
if (!CONFIG[currentSeason]) {
    console.error('找不到配置:', currentSeason);
} else {
    // 從賽季配置中獲取 SHEET_ID 和 API_KEY
    const SHEET_ID = CONFIG[currentSeason].SHEET_ID;
    const API_KEY = CONFIG[currentSeason].API_KEY;
    
    console.log('使用配置 - SHEET_ID:', SHEET_ID, 'API_KEY:', API_KEY);
    
    // 其他變量初始化
    let allRankings = [];
    let currentPage = 1;
    const rowsPerPage = 10;
    let totalPages = 1;
    let currentData = [];
    
    async function loadRankings() {
        try {
            // 隊伍排名的欄位範圍依賽季而定，定義在 config/config.js 的 rankRange
            const isS5OrS6 = seasonMeta.rankRange === 'O:V';
            const sheetName = 'schedule';
            const range = `${sheetName}!${seasonMeta.rankRange}`;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

            console.log("當前賽季:", currentSeason);
            console.log("是否為 S5/S6:", isS5OrS6);
            console.log("正在請求 URL:", url);
            
            const response = await fetch(url);
            console.log("API 響應狀態:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("收到的數據:", data);
            
            if (!data.values || data.values.length === 0) {
                throw new Error('No data found in sheet');
            }

            const tableBody = document.getElementById('rankTableBody');
            
            // 將數據轉換為對象數組以便排序
            let rankings = data.values.slice(1)
                .map((row) => {
                    if (isS5OrS6) {
                        // O:V，其中 O 為排名（忽略，改由我們重排計算）
                        const team = row[1] || '';
                        const total = parseFloat(row[7]);
                        return {
                            team,
                            wins: row[2] || '',       // Q 欄: 勝
                            losses: row[3] || '',     // R 欄: 敗
                            draws: row[4] || '',      // S 欄: 和
                            points: row[5] || '',     // T 欄: 積分
                            bonus: row[6] || '',      // U 欄: 飲酒加成
                            total: isNaN(total) ? 0 : total // V 欄: 總分
                        };
                    }
                    // S3/S4 欄位
                    return {
                        team: row[0] || '',        // K 欄: 隊名
                        wins: row[1] || '',        // L 欄: 勝
                        losses: row[2] || '',      // M 欄: 敗
                        draws: row[3] || '',       // N 欄: 和
                        points: row[4] || '',      // O 欄: 積分
                        bonus: row[5] || '',       // P 欄: 飲酒加成
                        total: parseFloat(row[6] || 0) // Q 欄: 總分
                    };
                })
                // 過濾出真正的排名列，避免把賽程行混入
                .filter(item => {
                    if (!item.team || item.team.trim() === '') return false; // 必須有有效的隊名
                    
                    // 排除賽程相關的行（包含日期、比賽場次等關鍵字）
                    const teamLower = item.team.trim().toLowerCase();
                    const excludeKeywords = ['日期', '遊戲編號', '客場', '主場', '比賽地點', 'g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
                    if (excludeKeywords.some(keyword => teamLower.includes(keyword))) {
                        return false;
                    }
                    
                    // 必須有有效的總分
                    if (isS5OrS6) {
                        return !isNaN(item.total) && item.total >= 0;
                    }
                    return !isNaN(item.total);
                });

            // 依總分排序（降序）
            rankings.sort((a, b) => b.total - a.total);

            // 限制最多顯示 12 支隊伍，避免 schedule 工作表中的雜質行混入排名
            rankings = rankings.slice(0, 12);

            // 清空表格
            tableBody.innerHTML = '';

            // 重新填入排序後的數據
            rankings.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>           <!-- 排名 (1-8) -->
                    <td>${row.team}</td>
                    <td>${row.wins}</td>
                    <td>${row.losses}</td>
                    <td>${row.draws}</td>
                    <td>${row.points}</td>
                    <td>${row.bonus}</td>
                    <td>${row.total}</td>
                `;
                tableBody.appendChild(tr);
            });

        } catch (error) {
            console.error('載入排名時發生錯誤:', error);
            console.error('錯誤詳情:', error.stack);
            document.getElementById('rankTableBody').innerHTML = 
                `<tr><td colspan="8">載入排名時發生錯誤: ${error.message}</td></tr>`;
        }
    }

    // 頁面載入時執行
    document.addEventListener('DOMContentLoaded', () => {
        console.log('頁面載入完成，開始執行...');
        loadRankings();
        loadPersonalRankings();
    });

    async function loadPersonalRankings() {
        try {
            console.log('開始載入個人排名...');
            const range = 'personal!A:I';
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
            
            console.log("正在請求個人排名 URL:", url);
            
            const response = await fetch(url);
            console.log("個人排名 API 響應狀態:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("收到的個人排名數據:", data);
            
            if (!data.values || data.values.length === 0) {
                throw new Error('No data found in sheet');
            }

            // 將數據轉換為對象數組
            allRankings = data.values.slice(1).map((row, index) => ({
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

            // 設置初始數據
            currentData = [...allRankings];

            // 初始排序：依總勝場降序
            sortData('totalWins', false);  // false 表示降序

            // 設置篩選和排序功能
            setupFilters(allRankings);
            setupSorting();
            setupPagination();

        } catch (error) {
            console.error('載入個人排名時發生錯誤:', error);
            console.error('錯誤詳情:', error.stack);
            document.getElementById('personalTableBody').innerHTML = 
                `<tr><td colspan="10">載入個人排名時發生錯誤: ${error.message}</td></tr>`;
        }
    }

    function setupFilters(rankings) {
        const teamFilter = document.getElementById('teamFilter');
        const nameSearch = document.getElementById('nameSearch');
        const resetButton = document.getElementById('resetFilter');

        // 獲取唯一的隊伍列表並排序
        const uniqueTeams = [...new Set(rankings.map(row => row.team))]
            .filter(team => team)  // 移除空值
            .sort();

        // 清空現有選項並添加"所有隊伍"選項
        teamFilter.innerHTML = '<option value="">所有隊伍</option>';
        
        // 添加唯一的隊伍選項
        uniqueTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamFilter.appendChild(option);
        });

        // 篩選函數
        function filterRankings() {
            const searchText = nameSearch.value.toLowerCase();
            const selectedTeam = teamFilter.value;

            const filteredRankings = rankings.filter(row => {
                const nameMatch = row.name.toLowerCase().includes(searchText);
                const teamMatch = !selectedTeam || row.team === selectedTeam;
                return nameMatch && teamMatch;
            });

            updatePersonalTable(filteredRankings);
        }

        // 添加事件監聽器
        nameSearch.addEventListener('input', filterRankings);  // 即時搜尋
        teamFilter.addEventListener('change', filterRankings);

        // 重置篩選
        function resetFilters() {
            teamFilter.value = '';  // 重置下拉選單
            nameSearch.value = '';  // 清空搜尋框
            filterRankings();  // 重新顯示所有數據
        }

        // 添加重置按鈕事件
        resetButton.addEventListener('click', resetFilters);
    }

    // 更新表格數據
    function updatePersonalTable(rankings) {
        currentData = rankings;
        totalPages = Math.ceil(rankings.length / rowsPerPage);
        currentPage = 1;  // 重置到第一頁
        
        updatePageInfo();
        displayCurrentPage();
    }

    // 顯示當前頁數據
    function displayCurrentPage() {
        const tableBody = document.getElementById('personalTableBody');
        if (!tableBody) return;
        
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = currentData.slice(start, end);
        
        tableBody.innerHTML = '';
        
        pageData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${row.team}</td>
                <td>${row.name}</td>
                <td>${row.rate01}%</td>
                <td>${row.rateCR}%</td>
                <td>${row.totalWins}</td>
                <td>${row.totalRate}%</td>
                <td>${row.firstRate}%</td>
            `;
            tableBody.appendChild(tr);
        });

        updatePageInfo();
    }

    // 更新分頁資訊
    function updatePageInfo() {
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        // 更新按鈕狀態
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        
        if (prevButton && nextButton) {
            prevButton.disabled = currentPage === 1;
            nextButton.disabled = currentPage === totalPages;
        }
    }

    // 設置分頁事件監聽
    function setupPagination() {
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    displayCurrentPage();
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    displayCurrentPage();
                }
            });
        }
    }

    function setupSorting() {
        const headers = document.querySelectorAll('.sortable');
        let currentSort = {
            column: null,
            ascending: true
        };

        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-column');
                
                // 切換排序方向
                if (currentSort.column === column) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.column = column;
                    currentSort.ascending = true;
                }

                // 移除所有排序指示器
                headers.forEach(h => {
                    h.classList.remove('asc', 'desc');
                });

                // 添加當前排序指示器
                header.classList.add(currentSort.ascending ? 'asc' : 'desc');

                // 對完整數據進行排序
                sortData(column, currentSort.ascending);
            });
        });
    }

    function sortData(column, ascending) {
        // 對 currentData 進行排序
        currentData.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            // 處理數字和百分比
            if (typeof aValue === 'string' && aValue.includes('%')) {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else if (!isNaN(aValue)) {
                aValue = Number(aValue);
                bValue = Number(bValue);
            }

            if (ascending) {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // 重置到第一頁並更新顯示
        currentPage = 1;
        displayCurrentPage();
    }

    function updateTable(data) {
        filteredData = [...data];  // 保存過濾後的數據
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);
        
        // 更新分頁信息
        document.getElementById('currentPage').textContent = currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        // 計算當前頁的數據範圍
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = filteredData.slice(start, end);
        
        // 更新表格內容
        const tableBody = document.getElementById('personalTableBody');
        tableBody.innerHTML = '';
        
        pageData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${row.team}</td>
                <td>${row.name}</td>
                <td>${row.rate01}%</td>
                <td>${row.rateCR}%</td>
                <td>${row.totalWins}</td>
                <td>${row.totalRate}%</td>
                <td>${row.firstRate}%</td>
            `;
            tableBody.appendChild(tr);
        });

        // 更新分頁按鈕狀態
        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
    }
}
 