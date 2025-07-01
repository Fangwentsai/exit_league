// 賽程頁面的 JavaScript

// 在 schedule.js 頂部添加這些調試代碼
console.log('載入 schedule.js');
console.log('document.currentSeason =', document.currentSeason);
console.log('CONFIG 對象包含:', Object.keys(CONFIG));

// 頁面加載完成後執行
document.addEventListener('DOMContentLoaded', function() {
    console.log('頁面加載完成');
    
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
    
    // 獲取配置
    const config = CONFIG[currentSeason];
    if (!config) {
        console.error('找不到配置:', currentSeason);
        return;
    }
    
    // 獲取元素
    const loadingBar = document.getElementById('loadingBar');
    const loadingProgress = loadingBar.querySelector('.loading-progress');
    const leagueTable = document.getElementById('leagueTable');
    const teamButtons = document.querySelectorAll('.team-btn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    // 顯示加載進度條
    loadingBar.style.display = 'block';
    let progress = 0;
    const progressInterval = setInterval(function() {
        progress += 5;
        loadingProgress.style.width = `${Math.min(progress, 90)}%`;
        if (progress >= 90) clearInterval(progressInterval);
    }, 100);
    
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
            
            filterTable();
        });
    });
    
    // 取消按鈕點擊事件
    cancelBtn.addEventListener('click', function() {
        teamButtons.forEach(button => button.classList.remove('selected'));
        selectedTeams = [];
        
        const rows = leagueTable.querySelectorAll('tbody tr');
        rows.forEach(row => row.style.display = '');
    });
    
    // 過濾表格函數
    function filterTable() {
        if (selectedTeams.length === 0) {
            const rows = leagueTable.querySelectorAll('tbody tr');
            rows.forEach(row => row.style.display = '');
            return;
        }
        
        const rows = leagueTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.cells.length >= 4) {
                const awayTeam = row.cells[1].textContent; // 客隊在第2列
                const homeTeam = row.cells[3].textContent; // 主隊在第4列
                
                if (selectedTeams.includes(homeTeam) || selectedTeams.includes(awayTeam)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }
    
    // 顯示比賽詳情的函數
    function showMatchDetails(gameUrl) {
        // 創建模態框
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
        
        // 關閉模態框的事件
        const closeBtn = modal.querySelector('.match-modal-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // 點擊模態框外部關閉
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    // 添加一個函數來判斷當前頁面並返回對應的賽季路徑
    function getSeasonPath() {
        // 獲取當前頁面的URL
        const currentUrl = window.location.pathname;
        
        // 檢查URL中是否包含"scheduleS4.html"
        if (currentUrl.includes('scheduleS4.html')) {
            console.log('檢測到第4賽季頁面，連結到season4目錄');
            return 'season4';
        } else {
            console.log('檢測到其他頁面，連結到season3目錄');
            return 'season3';
        }
    }
    
    // 構建 API URL
    const RANGE= 'schedule!A1:F1000';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/${RANGE}?key=${config.API_KEY}`;
    console.log('API URL:', url);
    
    // 獲取數據
    fetch(url)
        .then(response => {
            console.log('API 響應狀態:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('收到數據');
            
            // 完成加載
            loadingProgress.style.width = '100%';
            setTimeout(() => {
                loadingBar.style.display = 'none';
            }, 500);
            
            // 處理數據
            if (!data || !data.values || data.values.length === 0) {
                console.error('沒有數據');
                leagueTable.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">沒有數據</td></tr>';
                return;
            }
            
            // 輸出原始數據的前幾行用於調試
            console.log('原始數據前5行:', data.values.slice(0, 5));
            
            // 清空表格
            leagueTable.innerHTML = '';
            
            // 定義固定的表頭
            const headers = ['日期', '客隊', '比分', '主隊'];
            console.log('使用固定表頭:', headers);
            
            // 創建表頭
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            headers.forEach((header, index) => {
                const th = document.createElement('th');
                th.textContent = header;
                
                // 為日期/場次的表頭添加淺灰色背景
                if (index === 0) {
                    th.style.backgroundColor = '#f0f0f0'; // 淺灰色
                }
                
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            leagueTable.appendChild(thead);
            
            // 創建表格內容
            const tbody = document.createElement('tbody');
            
            // 處理數據行
            let rowCount = 0;
            
            // 建立一個計數器來追蹤實際的遊戲編號
            let gameCounter = 1;
            
            // 獲取當前賽季路徑
            const seasonPath = getSeasonPath();
            
            // 從第1行開始處理數據（跳過可能的空行）
            for (let i = 0; i < data.values.length; i++) {
                const rowData = data.values[i];
                
                // 跳過空行
                if (!rowData || rowData.length === 0) {
                    continue;
                }
                
                // 跳過長度不足的行 (至少需要A,B,C,D,E,F欄)
                if (rowData.length < 6) {
                    console.log(`跳過行 ${i}: 數據不完整`, rowData);
                    continue;
                }
                
                // 使用 gameCounter 來生成遊戲編號
                const gameNumber = `g${String(gameCounter).padStart(2, '0')}`;
                const gameUrl = `../game_result/${seasonPath}/${gameNumber}.html`;
                gameCounter++; // 每次處理完一場比賽後增加計數器
                
                // 創建行
                const row = document.createElement('tr');
                
                // 添加日期/場次 (可點擊)
                const dateCell = document.createElement('td');
                dateCell.style.backgroundColor = '#f0f0f0'; // 為日期/場次單元格添加淺灰色背景
                dateCell.className = 'date-cell';
                
                // 創建可點擊的鏈接
                const dateLink = document.createElement('a');
                dateLink.href = '#';
                dateLink.className = 'match-link';
                dateLink.setAttribute('data-game', gameUrl);
                dateLink.textContent = rowData[0] || '';
                
                // 添加點擊事件
                dateLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const gameUrl = e.target.getAttribute('data-game');
                    showMatchDetails(gameUrl);
                });
                
                dateCell.appendChild(dateLink);
                row.appendChild(dateCell);
                
                // 添加客隊（B欄）
                const awayTeamCell = document.createElement('td');
                awayTeamCell.className = 'team-cell';
                awayTeamCell.textContent = rowData[1] || '';
                row.appendChild(awayTeamCell);
                
                // 添加比分（C欄客隊分數 - E欄主隊分數）
                const scoreCell = document.createElement('td');
                scoreCell.className = 'score-cell';
                const awayScore = rowData[2] || '';
                const homeScore = rowData[4] || '';
                scoreCell.textContent = (awayScore && homeScore) ? `${awayScore} - ${homeScore}` : 'vs';
                scoreCell.style.textAlign = 'center';
                row.appendChild(scoreCell);
                
                // 添加主隊（F欄）
                const homeTeamCell = document.createElement('td');
                homeTeamCell.className = 'team-cell';
                homeTeamCell.textContent = rowData[5] || '';
                row.appendChild(homeTeamCell);
                
                tbody.appendChild(row);
                rowCount++;
            }
            
            leagueTable.appendChild(tbody);
            console.log(`顯示了 ${rowCount} 行數據`);
            
            // 如果沒有數據
            if (rowCount === 0) {
                const noDataRow = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.colSpan = headers.length;
                noDataCell.textContent = `沒有找到賽程數據`;
                noDataCell.style.padding = '20px';
                noDataCell.style.textAlign = 'center';
                noDataRow.appendChild(noDataCell);
                tbody.appendChild(noDataRow);
            }
            
            // 添加表格樣式
            const tableStyle = document.createElement('style');
            tableStyle.textContent = `
                .date-cell a {
                    color: #333;
                    text-decoration: none;
                    cursor: pointer;
                }
                .date-cell a:hover {
                    text-decoration: underline;
                    color: #0066cc;
                }
                .team-cell {
                    font-weight: bold;
                }
                .score-cell {
                    text-align: center;
                    font-weight: bold;
                }
                .vs-cell {
                    text-align: center;
                    color: #999;
                }
            `;
            document.head.appendChild(tableStyle);
        })
        .catch(error => {
            console.error('獲取數據錯誤:', error);
            
            // 隱藏加載條
            loadingBar.style.display = 'none';
            
            // 顯示錯誤
            leagueTable.innerHTML = '';
            const errorRow = document.createElement('tr');
            const errorCell = document.createElement('td');
            errorCell.colSpan = 4; // 修改為4列
            errorCell.textContent = `獲取數據時出錯: ${error.message}`;
            errorCell.style.color = 'red';
            errorCell.style.padding = '20px';
            errorCell.style.textAlign = 'center';
            errorRow.appendChild(errorCell);
            leagueTable.appendChild(errorRow);
        });
});