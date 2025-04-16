// 根據頁面 URL 自動確定當前賽季
let currentSeason = 'SEASON3'; // 默認為第三屆
    
// 獲取當前頁面的文件名
const currentPath = window.location.pathname;
const fileName = currentPath.split('/').pop();

console.log('當前頁面:', fileName);

// 根據文件名確定賽季
if (fileName.includes('S4') || fileName.includes('s4') || fileName.includes('4')) {
    currentSeason = 'SEASON4';
} else if (fileName.includes('S3') || fileName.includes('s3') || fileName.includes('3')) {
    currentSeason = 'SEASON3';
}

console.log('自動檢測到賽季:', currentSeason);

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
            const range = 'schedule!K:Q';
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;

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
                .map((row, index) => ({
                    team: row[0] || '',        // K欄: 隊名
                    wins: row[1] || '',        // L欄: 勝
                    losses: row[2] || '',      // M欄: 敗
                    draws: row[3] || '',       // N欄: 和
                    points: row[4] || '',      // O欄: 積分
                    bonus: row[5] || '',       // P欄: 飲酒加成
                    total: parseFloat(row[6] || 0)  // Q欄: 總分，轉換為數字
                }));

            // 依總分排序（降序）
            rankings.sort((a, b) => b.total - a.total);

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
                <td>${row.wins01}</td>
                <td>${row.rate01}%</td>
                <td>${row.winsCR}</td>
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
                <td>${row.wins01}</td>
                <td>${row.rate01}%</td>
                <td>${row.winsCR}</td>
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
 