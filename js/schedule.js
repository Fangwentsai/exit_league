// 從 config.js 獲取設定
const { SHEET_ID, API_KEY } = CONFIG;

async function loadSchedule() {
    try {
        const range = 'schedule!A:F';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        const table = document.getElementById('leagueTable');
        
        // 創建表頭
        const headerRow = document.createElement('tr');
        headerRow.className = 'header-row';
        headerRow.innerHTML = `
            <th>日期</th>
            <th>客隊</th>
            <th>客場分數</th>
            <th>VS</th>
            <th>主場分數</th>
            <th>主隊</th>
        `;
        table.appendChild(headerRow);

        // 在處理數據時添加日期分組
        let currentDate = '';
        let isOddGroup = true;

        // 處理數據 - 不使用合併儲存格
        data.values.slice(1).forEach((row, index) => {
            if (row && row.length >= 6) {
                const matchRow = document.createElement('tr');
                const date = row[0] || '';
                let awayTeam = row[1] || '';
                const awayScore = row[2] || '';
                const homeScore = row[4] || '';
                let homeTeam = row[5] || '';
                
                // 為每個日期生成對應的遊戲編號（g01, g02, ...）
                const gameNumber = `g${String(index + 1).padStart(2, '0')}`;
                const gameUrl = `../game_result/${gameNumber}.html`;
                
                matchRow.innerHTML = `
                    <td class="date-cell">
                        <a href="#" class="match-link" data-game="${gameUrl}">
                            ${date}
                        </a>
                    </td>
                    <td class="team-cell">${awayTeam}</td>
                    <td class="score-cell">${awayScore}</td>
                    <td class="vs-cell">VS</td>
                    <td class="score-cell">${homeScore}</td>
                    <td class="team-cell">${homeTeam}</td>
                `;
                
                // 添加點擊事件
                const matchLink = matchRow.querySelector('.match-link');
                matchLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const gameUrl = e.target.getAttribute('data-game');
                    showMatchDetails(gameUrl);
                });

                table.appendChild(matchRow);
            }
        });

        // 設置篩選功能
        setupFilters();

    } catch (error) {
        console.error('Error loading schedule:', error);
        document.getElementById('leagueTable').innerHTML = '<tr><td colspan="6">載入賽程時發生錯誤</td></tr>';
    }
}

function setupFilters() {
    const teamButtons = document.querySelectorAll('.team-btn');
    const cancelButton = document.getElementById('cancelBtn');
    const allRows = document.querySelectorAll('#leagueTable tr:not(.header-row)');
    let selectedTeams = new Set();

    teamButtons.forEach(button => {
        button.addEventListener('click', () => {
            const team = button.getAttribute('data-team');
            
            if (button.classList.contains('active')) {
                button.classList.remove('active');
                selectedTeams.delete(team);
                if (selectedTeams.size === 0) {
                    resetDisplay();
                    return;
                }
            } else {
                button.classList.add('active');
                selectedTeams.add(team);
            }

            // 修改篩選邏輯
            allRows.forEach(row => {
                const cells = row.getElementsByTagName('td');
                if (cells.length >= 6) {  // 確保有足夠的單元格
                    const team1 = cells[1].textContent; // 客隊
                    const team2 = cells[5].textContent; // 主隊
                    const shouldShow = selectedTeams.size === 0 || 
                                     Array.from(selectedTeams).some(team => 
                                         team1.includes(team) || team2.includes(team)
                                     );
                    row.style.display = shouldShow ? '' : 'none';
                }
            });
        });
    });

    // 重置顯示
    function resetDisplay() {
        selectedTeams.clear();
        teamButtons.forEach(button => button.classList.remove('active'));
        allRows.forEach(row => row.style.display = '');
    }

    // 取消按鈕
    cancelButton.addEventListener('click', resetDisplay);
}

// 添加顯示比賽詳情的函數，接受 URL 參數
function showMatchDetails(url) {
    const modal = document.createElement('div');
    modal.className = 'match-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'match-modal-content';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.className = 'match-iframe';
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(iframe);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', loadSchedule);