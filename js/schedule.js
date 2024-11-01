// 測試數據
const TEST_DATA = {
    values: [
        {
            date: "11/5",
            games: [
                ["逃生入口A", "", "vs", "", "逃生入口C"],
                ["逃生入口B", "", "vs", "", "JACK都說隊"],
                ["VIVI朝九晚五", "", "vs", "", "醉販"],
                ["海盜揪硬", "", "vs", "", "人生揪難"]
            ]
        },
        {
            date: "11/12",
            games: [
                ["海盜揪硬", "", "vs", "", "逃生入口A"],
                ["VIVI朝九晚五", "", "vs", "", "逃生入口B"],
                ["逃生入口C", "", "vs", "", "JACK都說隊"],
                ["醉販", "", "vs", "", "人生揪難"]
            ]
        }
        // ... 其他週次的資料
    ]
};

// 儲存選中的隊伍
let selectedTeams = new Set();

// 初始化篩選器
function initializeFilters() {
    // 綁定隊伍按鈕點擊事件
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const team = this.dataset.team;
            if (this.classList.contains('active')) {
                selectedTeams.delete(team);
                this.classList.remove('active');
            } else {
                selectedTeams.add(team);
                this.classList.add('active');
            }
            filterGames();
        });
    });

    // 綁定取消按鈕點擊事件
    document.getElementById('cancelBtn').addEventListener('click', function() {
        selectedTeams.clear();
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        filterGames();
    });
}

// 篩選比賽
function filterGames() {
    const filteredData = {
        values: TEST_DATA.values.map(weekData => {
            // 如果沒有選擇任何隊伍，顯示所有比賽
            if (selectedTeams.size === 0) {
                return weekData;
            }

            // 過濾符合所選隊伍的比賽
            const filteredGames = weekData.games.filter(game => 
                selectedTeams.has(game[0]) || selectedTeams.has(game[4])
            );

            return filteredGames.length > 0 ? {
                ...weekData,
                games: filteredGames
            } : null;
        }).filter(Boolean)
    };

    updateTable(filteredData);
}

// 更新表格
function updateTable(data) {
    const table = document.getElementById('leagueTable');
    let html = `
        <tr>
            <th class="table-header">日期</th>
            <th class="table-header">客場</th>
            <th class="table-header">分數</th>
            <th class="table-header"></th>
            <th class="table-header">分數</th>
            <th class="table-header">主場</th>
        </tr>
    `;
    
    data.values.forEach((weekData, weekIndex) => {
        const weekClass = weekIndex % 2 === 0 ? 'week-block-1' : 'week-block-2';
        
        weekData.games.forEach((game, index) => {
            if (index === 0) {
                html += `
                    <tr class="${weekClass}">
                        <td class="week-header" rowspan="${weekData.games.length}">
                            ${weekData.date}
                        </td>
                        <td>${game[0]}</td>
                        <td>${game[1]}</td>
                        <td>${game[2]}</td>
                        <td>${game[3]}</td>
                        <td>${game[4]}</td>
                    </tr>
                `;
            } else {
                html += `
                    <tr class="${weekClass}">
                        <td>${game[0]}</td>
                        <td>${game[1]}</td>
                        <td>${game[2]}</td>
                        <td>${game[3]}</td>
                        <td>${game[4]}</td>
                    </tr>
                `;
            }
        });
    });

    table.innerHTML = html;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    updateTable(TEST_DATA);
    initializeFilters();
});