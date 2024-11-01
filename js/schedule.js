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
                const awayTeam = row[1] || '';
                const awayScore = row[2] || '';
                const homeScore = row[4] || '';
                const homeTeam = row[5] || '';
                
                // 如果日期改變，切換奇偶群組
                if (date !== currentDate) {
                    currentDate = date;
                    isOddGroup = !isOddGroup;
                }
                
                matchRow.setAttribute('data-date-group', isOddGroup ? 'odd' : 'even');
                matchRow.className = 'match-row';
                
                matchRow.innerHTML = `
                    <td class="date-cell">${date}</td>
                    <td class="team-cell">${awayTeam}</td>
                    <td class="score-cell">${awayScore}</td>
                    <td class="vs-cell">VS</td>
                    <td class="score-cell">${homeScore}</td>
                    <td class="team-cell">${homeTeam}</td>
                `;
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
    const allRows = document.querySelectorAll('.match-row');
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

            // 簡單的顯示/隱藏邏輯
            allRows.forEach(row => {
                const team1 = row.getAttribute('data-team1');
                const team2 = row.getAttribute('data-team2');
                const shouldShow = selectedTeams.size === 0 || 
                                 Array.from(selectedTeams).some(team => 
                                     team === team1 || team === team2
                                 );
                row.style.display = shouldShow ? '' : 'none';
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

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', loadSchedule);