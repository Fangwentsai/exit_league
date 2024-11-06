// 建立一個全域的比賽資料陣列
window.allMatches = window.allMatches || [];

// 新增比賽資料的函數
function addMatchData(matchData) {
    window.allMatches = window.allMatches.concat(matchData);
    console.log('已新增比賽資料，目前總場次:', window.allMatches.length);
}

// 比賽資料
const matches = [
    {set: 1, type: '01', away: 'Lucas', home: '隼隼', firstAttack: 'home', winner: 'away'},
    {set: 2, type: '01', away: 'Terry', home: '阿仁', firstAttack: 'home', winner: 'away'},
    {set: 3, type: '01', away: 'Jesse', home: '禹辰', firstAttack: 'home', winner: 'home'},
    {set: 4, type: '01', away: 'Eric', home: '華華', firstAttack: 'home', winner: 'home'},
    {set: 5, type: '01', away: ['Lucas','Jesse','Terry'], home: ['阿仁','Ace','隼隼'], firstAttack: 'home', winner: 'home'},
    {set: 6, type: 'CR', away: '阿誠', home: '隼隼', firstAttack: 'away', winner: 'away'},
    {set: 7, type: 'CR', away: 'Lucas', home: 'Ace', firstAttack: 'home', winner: 'home'},
    {set: 8, type: 'CR', away: '小倫', home: '禹辰', firstAttack: 'away', winner: 'away'},
    {set: 9, type: 'CR', away: 'Eric', home: '華', firstAttack: 'away', winner: 'home'},
    {set: 10, type: 'CR', away: ['小倫','阿誠','Eric'], home: ['禹辰','Ace','華華'], firstAttack: 'home', winner: 'home'},
    {set: 11, type: '01', away: ['Terry','Eric'], home: ['阿仁','Ace'], firstAttack: 'away', winner: 'away'},
    {set: 12, type: '01', away: ['小倫','Jesse'], home: ['華華','禹辰'], firstAttack: 'home', winner: 'away'},
    {set: 13, type: 'CR', away: ['Terry','阿誠'], home: ['阿仁','隼隼'], firstAttack: 'away', winner: 'away'},
    {set: 14, type: 'CR', away: ['小倫','Lucas'], home: ['華華','禹辰'], firstAttack: 'home', winner: 'home'},
    {set: 15, type: '01', away: ['小倫','Lucas','Jesse','Terry'], home: ['阿仁','隼隼','Ace','禹辰'], firstAttack: 'away', winner: 'home'},
    {set: 16, type: 'CR', away: ['小倫','Terry','Lucas','阿誠'], home: ['阿仁','隼隼','Ace','華華'], firstAttack: 'away', winner: 'home'}
];

// 分析選手數據的函數
function analyzePlayerStats(playerName, isHome = false) {
    console.log(`分析${isHome ? '主場' : '客場'}選手: ${playerName}`);
    
    let stats = {
        '01_games': 0,
        '01_wins': 0,
        'CR_games': 0,
        'CR_wins': 0,
        'firstAttacks': 0
    };

    window.allMatches.forEach(match => {
        const players = isHome ? match.home : match.away;
        const playersList = Array.isArray(players) ? players : [players];
        
        if (playersList.includes(playerName)) {
            if (match.type === '01') {
                stats['01_games']++;
                if (match.winner === (isHome ? 'home' : 'away')) {
                    stats['01_wins']++;
                }
            } else {
                stats['CR_games']++;
                if (match.winner === (isHome ? 'home' : 'away')) {
                    stats['CR_wins']++;
                }
            }
            
            if (match.firstAttack === (isHome ? 'home' : 'away')) {
                stats.firstAttacks++;
            }
        }
    });

    return stats;
}

// 更新表格的函數
function updateStatsTable(players, isHome) {
    console.log(`開始更新${isHome ? '主場' : '客場'}統計表格`);
    console.log('選手列表:', players);
    
    // 確保 players 是陣列
    if (!Array.isArray(players)) {
        console.error('players 不是陣列:', players);
        return;
    }
    
    const tableId = isHome ? 'homeStats' : 'awayStats';
    const table = document.getElementById(tableId);
    
    if (!table) {
        console.error(`找不到表格: #${tableId}`);
        return;
    }
    console.log(`找到表格: #${tableId}`);

    // 清空現有的表格內容（保留表頭）
    const rowCount = table.rows.length;
    console.log(`當前表格行數: ${rowCount}`);
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    // 添加每位選手的數據
    players.forEach(player => {
        console.log(`處理選手: ${player}`);
        const stats = analyzePlayerStats(player, isHome);
        const row = table.insertRow();
        
        row.innerHTML = `
            <td class="player-name">${player}</td>
            <td class="stat-cell">${stats['01_games']}</td>
            <td class="stat-cell">${stats['01_wins']}</td>
            <td class="stat-cell">${stats['CR_games']}</td>
            <td class="stat-cell">${stats['CR_wins']}</td>
            <td class="stat-cell">${stats['01_games'] + stats['CR_games']}</td>
            <td class="stat-cell">${stats['01_wins'] + stats['CR_wins']}</td>
            <td class="stat-cell">${stats['firstAttacks']}</td>
        `;
        console.log(`已新增 ${player} 的數據行`);
    });
}

// 初始化函數
function initializeStats(awayPlayers, homePlayers) {
    console.log('開始初始化統計資料...');
    console.log('客場選手:', awayPlayers);
    console.log('主場選手:', homePlayers);
    
    // 確保兩個參數都是陣列
    if (!Array.isArray(awayPlayers) || !Array.isArray(homePlayers)) {
        console.error('選手名單必須是陣列');
        return;
    }
    
    updateStatsTable(awayPlayers, false);
    updateStatsTable(homePlayers, true);

    // 設定切換按鈕事件
    const buttons = document.querySelectorAll('.stats-btn');
    console.log(`找到 ${buttons.length} 個切換按鈕`);
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const tables = document.querySelectorAll('.stats-table');
            tables.forEach(table => {
                if (table.id === this.dataset.team + 'Stats') {
                    table.classList.remove('hidden');
                } else {
                    table.classList.add('hidden');
                }
            });
        });
    });
}

// DOM 載入檢查
if (document.readyState === 'loading') {
    console.log('DOM 尚未載入，等待中...');
    document.addEventListener('DOMContentLoaded', initializeStats);
} else {
    console.log('DOM 已載入，直接執行初始化');
    initializeStats();
}

// 計算比賽分數
function calculateMatchScore(matches) {
    let awayScore = 0;
    let homeScore = 0;

    matches.forEach(match => {
        let points;
        // 依據場次決定分數
        if ([1,2,3,4,6,7,8,9].includes(match.set)) {
            points = 1;
        } else if ([11,12,13,14].includes(match.set)) {
            points = 2;
        } else if ([5,10].includes(match.set)) {
            points = 3;
        } else if ([15,16].includes(match.set)) {
            points = 4;
        }

        // 計算得分
        if (match.winner === 'away') {
            awayScore += points;
        } else {
            homeScore += points;
        }
    });

    return { awayScore, homeScore };
}

// 計算最終總分
function calculateFinalScore(matches, drinkingBonus = { away: 0, home: 0 }) {
    // 計算比賽基礎分數
    const baseScores = calculateMatchScore(matches);
    
    // 計算勝場加成（比賽分數高的一方加1分）
    const winnerBonus = {
        away: baseScores.awayScore > baseScores.homeScore ? 1 : 0,
        home: baseScores.homeScore > baseScores.awayScore ? 1 : 0
    };

    // 計算最終總分
    const finalScores = {
        away: baseScores.awayScore + winnerBonus.away + drinkingBonus.away,
        home: baseScores.homeScore + winnerBonus.home + drinkingBonus.home,
        details: {
            baseScores,
            winnerBonus,
            drinkingBonus
        }
    };

    return finalScores;
}

// 更新分數顯示
function updateScoreDisplay(scores) {
    // 更新總分顯示
    //document.querySelector('.team.away .team-name').textContent = '逃生入口A';
    //document.querySelector('.team.home .team-name').textContent = '逃生入口C';
    document.querySelector('.team.away .team-score').textContent = scores.away;
    document.querySelector('.team.home .team-score').textContent = scores.home;

    // 建立並插入分數明細表格
    const scoreDetails = `
        <div class="score-details">
            <table class="score-table">
                <tr>
                    <th></th>
                    <th>${document.querySelector('.team.away .team-name').textContent}</th>
                    <th>${document.querySelector('.team.home .team-name').textContent}</th>
                </tr>
                <tr>
                    <td>比賽成績</td>
                    <td>${scores.details.baseScores.awayScore}</td>
                    <td>${scores.details.baseScores.homeScore}</td>
                </tr>
                <tr>
                    <td>勝場加成</td>
                    <td>${scores.details.winnerBonus.away}</td>
                    <td>${scores.details.winnerBonus.home}</td>
                </tr>
                <tr>
                    <td>飲酒加成</td>
                    <td>${scores.details.drinkingBonus.away}</td>
                    <td>${scores.details.drinkingBonus.home}</td>
                </tr>
                <tr>
                    <td>最終總分</td>
                    <td class="final-score">${scores.away}</td>
                    <td class="final-score">${scores.home}</td>
                </tr>
            </table>
        </div>
    `;

    // 插入到 match-result 後面
    const matchResult = document.querySelector('.match-result');
    matchResult.insertAdjacentHTML('afterend', scoreDetails);
}

// 新增生成戰況表格的函數
function generateMatchTable(matches) {
    const tableHTML = `
        <div class="game-section">
            <h3>比賽戰況</h3>
            <table class="game-table">
                <tr>
                    <th>場次</th>
                    <th>賽制</th>
                    <th>客場選手</th>
                    <th>主場選手</th>
                    <th>先攻</th>
                    <th>勝方</th>
                </tr>
                ${matches.map(match => `
                    <tr>
                        <td>SET ${match.set}</td>
                        <td>${match.type}</td>
                        <td>${Array.isArray(match.away) ? match.away.join(',') : match.away}</td>
                        <td>${Array.isArray(match.home) ? match.home.join(',') : match.home}</td>
                        <td>${match.firstAttack === 'home' ? '主場' : '客場'}</td>
                        <td>${match.winner === 'home' ? '主場' : '客場'}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
    
    // 插入到 match-result 後面
    const matchResult = document.querySelector('.match-result');
    matchResult.insertAdjacentHTML('afterend', tableHTML);
} 