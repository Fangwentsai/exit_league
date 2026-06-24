const fs = require('fs');
const path = require('path');

const gameResultDir = path.join(__dirname, '../game_result/season6');
const outputCsv = path.join(__dirname, '../weekly_players.csv');

// 計分對照表雖然不影響出賽次數，但我們需要知道哪些是 01，哪些是 CR
// 根據 weekly_update.js 的邏輯：
function parseGameHtml(gameNum) {
    const file = path.join(gameResultDir, `g${gameNum.toString().padStart(2, '0')}.html`);
    if (!fs.existsSync(file)) {
        // 有些可能是 g1.html 而不是 g01.html
        const file2 = path.join(gameResultDir, `g${gameNum}.html`);
        if (!fs.existsSync(file2)) return null;
        return parseFile(file2, gameNum);
    }
    return parseFile(file, gameNum);
}

function parseFile(file, gameNum) {
    const html = fs.readFileSync(file, 'utf8');

    // 日期
    const dateMatch = html.match(/<h2 class="match-date">(.*?)<\/h2>/);
    const matchDate = dateMatch ? dateMatch[1] : '';

    // 隊名
    const awayTeamMatch = html.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
    const awayTeam = awayTeamMatch ? awayTeamMatch[1] : '';
    const homeTeamMatch = html.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
    const homeTeam = homeTeamMatch ? homeTeamMatch[1] : '';

    // 比賽資料 JS
    const matchesStr = html.match(/const g\d+Matches = (\[[\s\S]*?\]);/);
    const awayPlayersStr = html.match(/const awayPlayers = (\[.*?\]);/);
    const homePlayersStr = html.match(/const homePlayers = (\[.*?\]);/);

    if (!matchesStr || !awayPlayersStr || !homePlayersStr) {
        return null;
    }

    let m, ap, hp;
    try {
        m = eval('(' + matchesStr[1] + ')');
        ap = eval('(' + awayPlayersStr[1] + ')');
        hp = eval('(' + homePlayersStr[1] + ')');
    } catch (e) {
        return null;
    }

    // 計算選手數據
    const pStats = {};
    ap.forEach(p => pStats[p] = { team: awayTeam, p01: 0, w01: 0, pCR: 0, wCR: 0, total: 0, wins: 0, fa: 0 });
    hp.forEach(p => pStats[p] = { team: homeTeam, p01: 0, w01: 0, pCR: 0, wCR: 0, total: 0, wins: 0, fa: 0 });

    m.forEach(x => {
        const isHomeFirst = x.firstAttack === 'home';
        const ap_m = Array.isArray(x.away) ? x.away : [x.away];
        const hp_m = Array.isArray(x.home) ? x.home : [x.home];

        ap_m.forEach(p => {
            if (!pStats[p]) return;
            if (!isHomeFirst) pStats[p].fa++;
            pStats[p].total++;
            if (x.type === '01') {
                pStats[p].p01++;
                if (x.winner === 'away') { pStats[p].w01++; pStats[p].wins++; }
            } else {
                pStats[p].pCR++;
                if (x.winner === 'away') { pStats[p].wCR++; pStats[p].wins++; }
            }
        });

        hp_m.forEach(p => {
            if (!pStats[p]) return;
            if (isHomeFirst) pStats[p].fa++;
            pStats[p].total++;
            if (x.type === '01') {
                pStats[p].p01++;
                if (x.winner === 'home') { pStats[p].w01++; pStats[p].wins++; }
            } else {
                pStats[p].pCR++;
                if (x.winner === 'home') { pStats[p].wCR++; pStats[p].wins++; }
            }
        });
    });

    return {
        gId: `G${gameNum.toString().padStart(2, '0')}`,
        date: matchDate,
        players: Object.entries(pStats).map(([name, s]) => ({ name, ...s }))
    };
}

// 自動掃描 game_result/season6/ 目錄中所有 gXXX.html
const files = fs.readdirSync(gameResultDir)
    .filter(f => /^g\d+\.html$/.test(f))
    .map(f => parseInt(f.match(/\d+/)[0]))
    .sort((a, b) => a - b);

console.log(`📂 找到 ${files.length} 場比賽: G${files[0]}~G${files[files.length - 1]}`);

let csv = '\ufeff日期,遊戲編號,隊伍,選手,01出賽,01勝場,CR出賽,CR勝場,合計出賽,合計勝場,先攻數\n';

for (const i of files) {
    const data = parseGameHtml(i);
    if (data) {
        data.players.forEach(s => {
            csv += `${data.date},${data.gId},${s.team},${s.name},${s.p01},${s.w01},${s.pCR},${s.wCR},${s.total},${s.wins},${s.fa}\n`;
        });
    }
}

fs.writeFileSync(outputCsv, csv, 'utf8');
console.log(`✅ 已成功生成 weekly_players.csv（共 ${files.length} 場）`);
