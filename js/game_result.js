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

// DOM 載入檢查 - 只在非預覽模式下自動執行
if (!window.location.href.includes('preview') && !document.querySelector('.preview-header')) {
    if (document.readyState === 'loading') {
        console.log('DOM 尚未載入，等待中...');
        document.addEventListener('DOMContentLoaded', function() {
            // 只有在一般比賽結果頁面才自動執行（有預設選手數據）。
            // 新版賽果版型（頁面有 #paneStats）自己渲染統計表，舊的會找不到
            // #awayStats/#homeStats 而報錯，所以跳過。
            if (typeof awayPlayers !== 'undefined' && typeof homePlayers !== 'undefined'
                && !document.getElementById('matchResult')) {
                initializeStats(awayPlayers, homePlayers);
            }
        });
    } else {
        console.log('DOM 已載入，直接執行初始化');
        // 同上：新版型自己渲染統計表
        if (typeof awayPlayers !== 'undefined' && typeof homePlayers !== 'undefined'
            && !document.getElementById('matchResult')) {
            initializeStats(awayPlayers, homePlayers);
        }
    }
}

// 每個 SET 的分值。全站唯一一份權重——賽果頁的逐 SET 走勢條、選手得分欄
// 與總分計算都要用同一個，分成兩份遲早會分岔。
// 五屆都是 16 場同一套格式（2026/09 全站盤點確認）。
function pointsForSet(set) {
    if ([5, 10].includes(set)) return 3;
    if ([15, 16].includes(set)) return 4;
    if ([11, 12, 13, 14].includes(set)) return 2;
    return 1;
}

// 計算比賽分數
function calculateMatchScore(matches) {
    let awayScore = 0;
    let homeScore = 0;

    matches.forEach(match => {
        const points = pointsForSet(match.set);

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

// 頁面載入完成後執行的函數
document.addEventListener('DOMContentLoaded', function() {
    // 處理勝利圖標的位置
    setupWinnerIcons();

    // 其他頁面初始化代碼...
    setupStatsButtons();

    // 把選手姓名做成可點擊連結，連到 player.html 顯示跨屆生涯成績。
    // 放在這裡（DOMContentLoaded 最後）是因為每場比賽的 SET 戰況表是各
    // 頁面自己寫死的靜態 HTML，統計表則是本檔案上面的 initializeStats()
    // 同步填好的，兩者到這個時間點都已經在 DOM 裡了。
    linkifyGameResultPlayerNames();
});

// 這個頁面永遠是被 showMatchDetails() 用 iframe 開出來的比賽詳情頁，
// 所以點姓名不用再彈一層 iframe，直接在 iframe 裡原地跳轉到 player.html，
// 讓使用者可以用瀏覽器上一頁／手勢滑動回到比賽詳情。
function openPlayerPage(name, team) {
    if (!name) return;
    const url = `../../pages/player.html?name=${encodeURIComponent(name)}&team=${encodeURIComponent(team || '')}`;
    window.location.href = url;
}

// 把一個儲存格裡的選手姓名文字節點包成可點擊的 <span class="player-link">。
// 多人賽（例如三人賽）的姓名是用「, 」隔開存在同一個文字節點裡，所以要先
// 切開，其餘像 winner-icon 這種子元素維持原樣，只處理純文字部分。
function linkifyPlayerCell(cell, team) {
    if (!cell) return;
    const textNodes = Array.prototype.filter.call(cell.childNodes, function (n) {
        return n.nodeType === Node.TEXT_NODE && n.textContent.trim();
    });
    textNodes.forEach(function (node) {
        const names = node.textContent.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!names.length) return;
        const frag = document.createDocumentFragment();
        names.forEach(function (n, i) {
            if (i > 0) frag.appendChild(document.createTextNode(', '));
            const span = document.createElement('span');
            span.className = 'player-link';
            span.textContent = n;
            span.addEventListener('click', function (e) {
                e.stopPropagation();
                openPlayerPage(n, team);
            });
            frag.appendChild(span);
        });
        node.parentNode.replaceChild(frag, node);
    });
}

function linkifyGameResultPlayerNames() {
    const awayTeamEl = document.querySelector('.team.away .team-name');
    const homeTeamEl = document.querySelector('.team.home .team-name');
    const awayTeam = awayTeamEl ? awayTeamEl.textContent.trim() : '';
    const homeTeam = homeTeamEl ? homeTeamEl.textContent.trim() : '';

    // SET 戰況表：每個 .game-table（統計表除外）扣掉表頭列，第2欄是客場
    // 選手、第3欄是主場選手。
    document.querySelectorAll('.game-table:not(.stats-table)').forEach(function (table) {
        Array.prototype.forEach.call(table.rows, function (row, idx) {
            if (idx === 0) return; // 表頭列
            if (row.cells.length < 3) return;
            linkifyPlayerCell(row.cells[1], awayTeam);
            linkifyPlayerCell(row.cells[2], homeTeam);
        });
    });

    // 個人數據統計表：.player-name 那欄
    [['awayStats', awayTeam], ['homeStats', homeTeam]].forEach(function (pair) {
        const table = document.getElementById(pair[0]);
        if (!table) return;
        Array.prototype.forEach.call(table.rows, function (row, idx) {
            if (idx === 0) return;
            linkifyPlayerCell(row.querySelector('.player-name'), pair[1]);
        });
    });
}

// 設置勝利圖標的位置
function setupWinnerIcons() {
    // 獲取所有帶有winner類別的單元格
    const winnerCells = document.querySelectorAll('.winner');
    
    // 遍歷每個單元格
    winnerCells.forEach(cell => {
        // 檢測內容是否包含逗號或<br>，表示是多人賽
        const cellText = cell.innerHTML;
        if (cellText.includes(',') || cellText.includes('<br>')) {
            // 添加多行樣式類
            cell.classList.add('winner-multiline');
        }
    });
}

// 設置統計按鈕的切換功能
function setupStatsButtons() {
    const statsBtns = document.querySelectorAll('.stats-btn');
    const awayStats = document.getElementById('awayStats');
    const homeStats = document.getElementById('homeStats');
    
    if (!statsBtns.length || !awayStats || !homeStats) return;
    
    statsBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有按鈕的活動狀態
            statsBtns.forEach(b => b.classList.remove('active'));
            // 添加當前按鈕的活動狀態
            this.classList.add('active');
            
            // 顯示對應的統計表格
            const team = this.getAttribute('data-team');
            if (team === 'away') {
                awayStats.classList.remove('hidden');
                homeStats.classList.add('hidden');
            } else {
                homeStats.classList.remove('hidden');
                awayStats.classList.add('hidden');
            }
        });
    });
} 
// ============================================================
// 賽果頁版型（2026/09 改版，參考 Apple Sports 的賽果頁）
//
// 整頁由這支渲染，頁面只需要 <div class="container" id="matchResult"></div>
// 與一段資料。舊版頁面沒有 #matchResult，行為完全不受影響。
//
// meta 需要：{ date, venue, away, home, types }
//   types 是 SET 編號 → 賽制名稱（'501 (OI/MO)' 之類）。這份資料原本只寫在
//   每頁的靜態 HTML 裡，改版時抽出來放進頁面的資料區。
// ============================================================

function mrEsc(t) {
    return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function mrList(v) {
    return Array.isArray(v) ? v : [v];
}

// 三人賽強制單行（字級縮一級才塞得下），四人賽強制兩行、每行兩人
function mrNames(v) {
    const a = mrList(v);
    if (a.length >= 4) {
        return '<div class="nm n4">' + mrEsc(a.slice(0, 2).join(', ')) + '<br>' + mrEsc(a.slice(2).join(', ')) + '</div>';
    }
    if (a.length === 3) return '<div class="nm n3">' + mrEsc(a.join(', ')) + '</div>';
    return '<div class="nm">' + mrEsc(a.join(', ')) + '</div>';
}

// 每列領先方紅、落後方灰，持平兩邊同色。勝場與比賽成績兩列相鄰時，
// 紅色區塊左右跳動就是加權計分造成的落差，不必另外用文字說明。
function mrCmpRow(label, a, h) {
    const tot = (a + h) || 1;
    const aLead = a > h, hLead = h > a;
    const col = (lead, trail) => lead ? '#dc3545' : (trail ? '#adb5bd' : '#c8ced4');
    return '<div class="cmp"><div class="cmp-top">'
        + '<span class="cmp-v ' + (aLead ? 'lead' : hLead ? 'trail' : '') + '">' + a + '</span>'
        + '<span class="cmp-l">' + mrEsc(label) + '</span>'
        + '<span class="cmp-v ' + (hLead ? 'lead' : aLead ? 'trail' : '') + '">' + h + '</span></div>'
        + '<div class="cmp-bar"><i style="width:' + (a / tot * 100).toFixed(1) + '%;background:' + col(aLead, hLead) + '"></i>'
        + '<i style="width:' + (h / tot * 100).toFixed(1) + '%;background:' + col(hLead, aLead) + '"></i></div></div>';
}

function mrStatRows(matches, side, roster) {
    const acc = {};
    (roster || []).forEach(n => acc[n] = { p: 0, w: 0, f: 0, pts: 0 });
    matches.forEach(m => {
        mrList(m[side]).forEach(n => {
            if (!acc[n]) acc[n] = { p: 0, w: 0, f: 0, pts: 0 };
            acc[n].p++;
            if (m.winner === side) { acc[n].w++; acc[n].pts += pointsForSet(m.set); }
            if (m.firstAttack === side) acc[n].f++;
        });
    });
    return Object.entries(acc).filter(([, d]) => d.p > 0)
        .sort((x, y) => y[1].w - x[1].w || y[1].p - x[1].p || x[0].localeCompare(y[0]))
        .map(([n, d]) => '<tr><td class="pn">' + mrEsc(n) + '</td><td>' + d.p + '</td>'
            + '<td class="wv">' + d.w + '</td><td>' + d.f + '</td><td>' + d.pts + '</td></tr>').join('');
}

function renderMatchResult(matches, meta, drinkingBonus, awayPlayers, homePlayers) {
    const root = document.getElementById('matchResult');
    if (!root) return;

    const scores = calculateFinalScore(matches, drinkingBonus || { away: 0, home: 0 });
    const won = side => matches.filter(m => m.winner === side).length;
    const got = side => matches.filter(m => m.winner === side).reduce((s, m) => s + pointsForSet(m.set), 0);
    const first = side => matches.filter(m => m.firstAttack === side).length;
    const awayWon = scores.away > scores.home;
    const SW = c => '<i class="sw" style="background:' + c + '"></i>';

    const cols = [['比賽成績', scores.details.baseScores.awayScore, scores.details.baseScores.homeScore],
                  ['勝場加成', scores.details.winnerBonus.away, scores.details.winnerBonus.home],
                  ['飲酒加成', scores.details.drinkingBonus.away, scores.details.drinkingBonus.home],
                  ['最終得分', scores.away, scores.home]];
    const detRow = (name, sw, i, lose) => '<tr><td>' + SW(sw) + mrEsc(name) + '</td>'
        + cols.map(c => '<td class="' + (c[0] === '最終得分' ? 'fin' + (lose ? ' lose' : '') : '') + '">' + c[i] + '</td>').join('')
        + '</tr>';

    // 段寬＝該 SET 分值，所以顏色佔比＝比分佔比，4 分場自然比 1 分場寬四倍
    const strip = side => matches.map(m => {
        const mine = m.winner === side, p = pointsForSet(m.set);
        return '<i class="sg ' + (mine ? (side === 'away' ? 'on-a' : 'on-h') : 'off') + '" style="flex:' + p + '">'
            + (mine ? p : '') + '</i>';
    }).join('');

    const cell = (m, side) => '<td class="pl' + (m.winner === side ? ' win' : '') + '">' + mrNames(m[side])
        + '<div class="fa-row">' + (m.firstAttack === side ? '<span class="fa">先攻</span>' : '') + '</div></td>';

    const statHead = '<tr><th>選手</th><th>出賽</th><th>勝場</th><th>先攻</th><th>得分</th></tr>';

    root.innerHTML =
        '<div class="head">'
        + '<div class="meta"><b>' + mrEsc(meta.date) + '</b> ・ ' + mrEsc(meta.venue) + '</div>'
        + '<div class="scoreline">'
        + '<div class="side"><span class="tag">客場</span><span class="tname">' + mrEsc(meta.away) + '</span>'
        + '<span class="tscore ' + (awayWon ? 'win' : 'lose') + '">' + scores.away + '</span></div>'
        + '<div class="state">終場</div>'
        + '<div class="side"><span class="tag">主場</span><span class="tname">' + mrEsc(meta.home) + '</span>'
        + '<span class="tscore ' + (awayWon ? 'lose' : 'win') + '">' + scores.home + '</span></div>'
        + '</div>'
        + '<table class="det"><tr><th></th>' + cols.map(c => '<th>' + c[0] + '</th>').join('') + '</tr>'
        + detRow(meta.away, 'var(--slate)', 1, !awayWon) + detRow(meta.home, 'var(--red)', 2, awayWon) + '</table>'
        + '</div>'
        + '<div class="sec">' + mrCmpRow('勝場', won('away'), won('home'))
        + mrCmpRow('比賽成績', got('away'), got('home'))
        + mrCmpRow('先攻場次', first('away'), first('home')) + '</div>'
        + '<div class="sec">'
        + '<div class="legend"><span>' + SW('var(--slate)') + mrEsc(meta.away) + '</span><span>' + got('away') + ' 分</span></div>'
        + '<div class="strip">' + strip('away') + '</div>'
        + '<div class="legend" style="margin-top:6px"><span>' + SW('var(--red)') + mrEsc(meta.home) + '</span><span>' + got('home') + ' 分</span></div>'
        + '<div class="strip">' + strip('home') + '</div></div>'
        + '<div class="tabs"><button class="tab on" data-p="paneGames">賽況</button>'
        + '<button class="tab" data-p="paneStats">統計</button></div>'
        + '<div class="pane" id="paneGames"><table class="g">'
        + '<tr><th>賽局</th><th>' + mrEsc(meta.away) + '</th><th>' + mrEsc(meta.home) + '</th></tr>'
        + matches.map(m => {
            const p = pointsForSet(m.set);
            return '<tr><td class="st"><div class="l1"><b>SET' + m.set + '</b>'
                + '<span class="pt p' + p + '">' + p + '分</span></div>'
                + '<div class="ty">' + mrEsc((meta.types || {})[m.set] || '') + '</div></td>'
                + cell(m, 'away') + cell(m, 'home') + '</tr>';
        }).join('') + '</table></div>'
        + '<div class="pane" id="paneStats" hidden>'
        + '<div class="ptitle">' + SW('var(--red)') + '主場 ' + mrEsc(meta.home) + '</div>'
        + '<table class="g">' + statHead + mrStatRows(matches, 'home', homePlayers) + '</table>'
        + '<div class="ptitle mt">' + SW('var(--slate)') + '客場 ' + mrEsc(meta.away) + '</div>'
        + '<table class="g">' + statHead + mrStatRows(matches, 'away', awayPlayers) + '</table></div>';

    root.querySelectorAll('.tab').forEach(b => b.onclick = () => {
        root.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
        ['paneGames', 'paneStats'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = id !== b.dataset.p;
        });
    });

    // 選手名字連到 player.html。linkifyPlayerCell 只掃儲存格的直接子文字節點，
    // 新版型名字包在 .nm 裡，所以對 .nm 呼叫。
    if (typeof linkifyPlayerCell === 'function') {
        document.querySelectorAll('#paneGames tr').forEach((row, idx) => {
            if (!idx || row.cells.length < 3) return;
            row.cells[1].querySelectorAll('.nm').forEach(d => linkifyPlayerCell(d, meta.away));
            row.cells[2].querySelectorAll('.nm').forEach(d => linkifyPlayerCell(d, meta.home));
        });
        document.querySelectorAll('#paneStats table').forEach((t, i) => {
            const team = i === 0 ? meta.home : meta.away;
            Array.prototype.forEach.call(t.rows, (row, idx) => {
                if (idx > 0) linkifyPlayerCell(row.cells[0], team);
            });
        });
    }
}
