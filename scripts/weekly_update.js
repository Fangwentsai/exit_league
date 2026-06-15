#!/usr/bin/env node
/**
 * weekly_update.js — 每週自動化主控腳本
 *
 * 使用方式：
 *   node scripts/weekly_update.js 61 66
 *   node scripts/weekly_update.js 61 66 --dry-run   (只計算，不寫入 Google Sheets)
 *   node scripts/weekly_update.js 61 66 --no-push   (不自動 git push)
 *
 * 功能：
 *   1. 解析 G61~G66 的 HTML 比賽資料
 *   2. 將本週賽事結果寫入 Google Sheets schedule 頁籤
 *   3. 將本週選手數據追加到 Google Sheets data 頁籤
 *   4. 從 personal 頁籤讀取最新排行榜並更新 news.html
 *   5. 自動 git commit + push
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ===== 設定 =====
const CONFIG = {
  season: 6,
  sheetId: '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM',
  apiKey: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
  // GAS Web App URL（用於寫入資料）
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbwJ3xPlfON7pkmeVKzpQImQhnlzpMz6Fn4Z1E7PwXVBZBvlncA7VCQ3tITyq9x8puAu/exec',
  gameResultDir: path.join(__dirname, '../game_result/season6'),
  newsHtmlPath: path.join(__dirname, '../pages/news.html'),
};

// 計分對照表 (set index → points)
const SET_POINTS = [0, 1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4];

// ===== 命令列引數 =====
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const startG = parseInt(args[0]);
const endG = parseInt(args[1]);
const isDryRun = flags.includes('--dry-run');
const noPush = flags.includes('--no-push');

if (!startG || !endG) {
  console.log('使用方式: node scripts/weekly_update.js <起始場次> <結束場次>');
  console.log('範例: node scripts/weekly_update.js 61 66');
  process.exit(1);
}

console.log(`\n🎯 開始處理 G${startG} ~ G${endG} 的賽事資料...\n`);
if (isDryRun) console.log('⚠️  Dry-run 模式：只計算，不寫入 Google Sheets\n');

// ===== 1. 解析 HTML 取得本週比賽資料 =====
function parseGameHtml(gameNum) {
  const file = path.join(CONFIG.gameResultDir, `g${gameNum}.html`);
  if (!fs.existsSync(file)) {
    console.warn(`  ⚠️  找不到 g${gameNum}.html，跳過`);
    return null;
  }
  const html = fs.readFileSync(file, 'utf8');

  // 日期
  const dateMatch = html.match(/<h2 class="match-date">(.*?)<\/h2>/);
  const matchDate = dateMatch ? dateMatch[1] : '';

  // 地點
  const venueMatch = html.match(/<div class="venue-info">(.*?)<\/div>/);
  const venue = venueMatch ? venueMatch[1] : '';

  // 隊名
  const awayTeamMatch = html.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
  const awayTeam = awayTeamMatch ? awayTeamMatch[1] : '';
  const homeTeamMatch = html.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
  const homeTeam = homeTeamMatch ? homeTeamMatch[1] : '';

  // 比賽資料 JS
  const matchesStr = html.match(new RegExp(`const g${gameNum}Matches = (\\[[\\s\\S]*?\\]);`));
  const drinkStr = html.match(/const drinkingBonus = (\{.*?\});/);
  const awayPlayersStr = html.match(/const awayPlayers = (\[.*?\]);/);
  const homePlayersStr = html.match(/const homePlayers = (\[.*?\]);/);

  if (!matchesStr || !drinkStr || !awayPlayersStr || !homePlayersStr) {
    console.warn(`  ⚠️  g${gameNum}.html 缺少比賽資料結構，跳過`);
    return null;
  }

  let m, d, ap, hp;
  try {
    eval(`m = ${matchesStr[1]}`);
    eval(`d = ${drinkStr[1]}`);
    eval(`ap = ${awayPlayersStr[1]}`);
    eval(`hp = ${homePlayersStr[1]}`);
  } catch (e) {
    console.warn(`  ⚠️  g${gameNum}.html 解析失敗: ${e.message}，跳過`);
    return null;
  }

  // 計算比賽積分
  let ab = 0, hb = 0;
  m.forEach(x => {
    const pts = SET_POINTS[x.set] || 0;
    if (x.winner === 'away') ab += pts;
    else hb += pts;
  });
  const aw = ab > hb ? 1 : 0;
  const hw = hb > ab ? 1 : 0;
  const totalAway = ab + aw + d.away;
  const totalHome = hb + hw + d.home;
  const winner = ab > hb ? awayTeam : (hb > ab ? homeTeam : '');
  const loser = ab > hb ? homeTeam : (hb > ab ? awayTeam : '');
  const draw = ab === hb ? 'Y' : '';

  // 飲酒加成 Label
  const drunkParts = [];
  if (d.away > 0) drunkParts.push(awayTeam);
  if (d.home > 0) drunkParts.push(homeTeam);
  const drunk = drunkParts.join(' & ');

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
    gId: `G${gameNum}`,
    date: matchDate,
    awayTeam, awayScore: totalAway,
    homeScore: totalHome, homeTeam,
    venue, winner, loser, drunk, draw,
    players: Object.entries(pStats).map(([name, s]) => ({ name, ...s }))
  };
}

// ===== 解析所有場次 =====
const weeklyGames = [];
for (let i = startG; i <= endG; i++) {
  process.stdout.write(`  📄 解析 G${i}...`);
  const data = parseGameHtml(i);
  if (data) {
    weeklyGames.push(data);
    console.log(` ✅  ${data.awayTeam} ${data.awayScore}:${data.homeScore} ${data.homeTeam}`);
  }
}

if (weeklyGames.length === 0) {
  console.log('\n❌ 沒有有效的比賽資料，結束。');
  process.exit(1);
}

console.log(`\n✅ 成功解析 ${weeklyGames.length} 場比賽\n`);

// ===== 輸出 CSV 備份（保留原有功能）=====
let mCsv = '遊戲編號,日期,客場,客場分數,vs,主場分數,主場,比賽地點,勝,敗,酒,和局\n';
weeklyGames.forEach(d => {
  mCsv += `${d.gId},${d.date},${d.awayTeam},${d.awayScore},vs,${d.homeScore},${d.homeTeam},${d.venue},${d.winner},${d.loser},${d.drunk},${d.draw}\n`;
});
fs.writeFileSync(path.join(__dirname, 'weekly_matches.csv'), '\ufeff' + mCsv, 'utf8');

let pCsv = '';
weeklyGames.forEach(g => {
  const teams = [...new Set(g.players.map(p => p.team))];
  teams.forEach(team => {
    pCsv += `${g.date},,,,,,,,\n`;
    pCsv += `選手,01出賽,01勝場,CR出賽,CR勝場,合計出賽,合計勝場,先攻數\n`;
    g.players.filter(p => p.team === team).forEach(s => {
      pCsv += `${s.name},${s.p01},${s.w01},${s.pCR},${s.wCR},${s.total},${s.wins},${s.fa}\n`;
    });
  });
});
fs.writeFileSync(path.join(__dirname, 'weekly_players.csv'), '\ufeff' + pCsv, 'utf8');
console.log('📊 CSV 備份已儲存 (weekly_matches.csv, weekly_players.csv)\n');

// ===== HTTP 工具函數 =====
function httpsPost(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    // 處理 redirect (Google Apps Script 有 302 redirect)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'GET' };
    const req = https.request(options, res => {
      // Handle redirect
      if (res.statusCode === 302 || res.statusCode === 301) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

// ===== 2. 寫入 Google Sheets =====
async function writeToGoogleSheets() {
  console.log('📤 寫入 Google Sheets...\n');

  const matchRows = weeklyGames.map(g => ({
    gId: g.gId,
    date: g.date,
    awayTeam: g.awayTeam,
    awayScore: g.awayScore,
    homeScore: g.homeScore,
    homeTeam: g.homeTeam,
    venue: g.venue,
    winner: g.winner,
    loser: g.loser,
    drunk: g.drunk,
    draw: g.draw
  }));

  const playerRows = [];
  weeklyGames.forEach(g => {
    playerRows.push({ date: g.date, type: 'date_header' });
    const teams = [...new Set(g.players.map(p => p.team))];
    teams.forEach(team => {
      playerRows.push({ team, type: 'team_header' });
      g.players.filter(p => p.team === team).forEach(s => {
        playerRows.push({
          type: 'player',
          name: s.name,
          team,
          p01: s.p01, w01: s.w01,
          pCR: s.pCR, wCR: s.wCR,
          total: s.total, wins: s.wins, fa: s.fa
        });
      });
    });
  });

  const payload = {
    action: 'weeklyUpdate',
    sheetId: CONFIG.sheetId,
    matchRows,
    playerRows
  };

  try {
    console.log(`  → POST 到 GAS Web App...`);
    const result = await httpsPost(CONFIG.gasWebAppUrl, payload);
    if (result.status === 'success') {
      console.log(`  ✅ Schedule 頁籤：已更新 ${result.scheduleUpdated || matchRows.length} 筆`);
      console.log(`  ✅ Data 頁籤：已追加 ${result.dataAppended || playerRows.length} 列`);
    } else {
      console.error(`  ❌ GAS 回傳錯誤:`, result.message || result);
    }
  } catch (err) {
    console.error(`  ❌ 寫入失敗: ${err.message}`);
    console.log('  💡 提示：請確認 GAS Web App 已更新並重新部署');
  }
}

// ===== 3. 從 Google Sheets 讀取排行榜 + 更新 news.html =====
async function fetchRankingsAndUpdateNews() {
  console.log('\n📊 從 Google Sheets 讀取最新排行榜...\n');

  const sheetsApiBase = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values`;
  const apiKey = CONFIG.apiKey;

  let teamRankings = [];
  let playerRankings = [];
  let topLadies = [];
  let unluckyPlayers = [];

  try {
    // ── 團隊總分排行：schedule!X2:Z13（X=排名, Y=隊名, Z=總分，公式自動計算）
    const teamUrl = `${sheetsApiBase}/schedule!X2:Z13?key=${apiKey}`;
    const teamData = await httpsGet(teamUrl);
    teamRankings = (teamData.values || [])
      .filter(r => r[1] && r[2])
      .map((r, idx) => ({ rank: r[0] || idx + 1, team: r[1], score: r[2] }));
    console.log(`  ✅ 團隊總分排行：${teamRankings.length} 隊（schedule X:Z）`);

    // ── 個人勝場排行：personal!T2:V6（T=隊名, U=姓名, V=勝場數）
    const playerUrl = `${sheetsApiBase}/personal!T2:V6?key=${apiKey}`;
    const playerData = await httpsGet(playerUrl);
    playerRankings = (playerData.values || [])
      .filter(r => r[1] && r[2])
      .map(r => ({ team: r[0], name: r[1], totalWins: r[2] }));
    console.log(`  ✅ 個人勝場排行：Top ${playerRankings.length}（personal T:V）`);

    // ── Top Lady：讀 personal!A2:N200，篩 N欄="女"，按 G欄(總勝場)排序取 Top 5
    //    A=隊伍, B=姓名, G=總勝場, N=性別(女/男)
    const allPersonalUrl = `${sheetsApiBase}/personal!A2:N200?key=${apiKey}`;
    const allPersonalData = await httpsGet(allPersonalUrl);
    const allPlayers = (allPersonalData.values || []).filter(r => r[0] && r[1]);

    topLadies = allPlayers
      .filter(r => (r[13] || '').trim() === '女')   // N欄(index 13) = '女'
      .map(r => ({ team: r[0], name: r[1], totalWins: parseInt(r[6]) || 0 }))  // G欄(index 6)
      .sort((a, b) => b.totalWins - a.totalWins)
      .slice(0, 5);
    console.log(`  ✅ Top Lady：Top ${topLadies.length}（personal N=女 + G欄排序）`);


    // ── 地獄倒霉鬼：personal!W2:Y6（W=隊名, X=姓名, Y=先攻機率）
    const unluckyUrl = `${sheetsApiBase}/personal!W2:Y6?key=${apiKey}`;
    const unluckyData = await httpsGet(unluckyUrl);
    unluckyPlayers = (unluckyData.values || [])
      .filter(r => r[1] && r[2])
      .map(r => ({ team: r[0], name: r[1], faRate: r[2] }));
    console.log(`  ✅ 地獄倒霉鬼：Top ${unluckyPlayers.length}（personal W:Y）`);

  } catch (err) {
    console.error(`  ❌ 讀取排行榜失敗: ${err.message}`);
    return;
  }

  // 更新 news.html
  updateNewsHtml(teamRankings, playerRankings, topLadies, unluckyPlayers);
}


// ===== 4. 更新 news.html 排行榜 =====
function updateNewsHtml(teamRankings, playerRankings, topLadies, unluckyPlayers) {
  console.log('\n📝 更新 news.html 排行榜...\n');

  if (!fs.existsSync(CONFIG.newsHtmlPath)) {
    console.error('  ❌ 找不到 news.html');
    return;
  }

  let html = fs.readFileSync(CONFIG.newsHtmlPath, 'utf8');

  // === 更新團隊總分排行表 ===
  if (teamRankings.length > 0) {
    const teamRows = teamRankings.map(t =>
      `                    <tr><td>${t.rank}</td><td>${t.team}</td><td>${t.score}</td></tr>`
    ).join('\n');

    html = html.replace(
      /<th>總分<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
      `<th>總分</th>\n                    </tr>\n${teamRows}\n                </table>`
    );
    console.log(`  ✅ 團隊排行：更新 ${teamRankings.length} 隊`);
  }

  // === 更新個人勝場排行 ===
  if (playerRankings.length > 0) {
    const playerRows = playerRankings.map(p =>
      `                    <tr><td>${p.team}</td><td>${p.name}</td><td>${p.totalWins}</td></tr>`
    ).join('\n');

    html = html.replace(
      /<th>勝場數<\/th>\s*<\/tr>\s*<tr>\s*<td>[\s\S]*?<\/table>/,
      `<th>勝場數</th>\n                    </tr>\n${playerRows}\n                </table>`
    );
    console.log(`  ✅ 個人勝場：更新 Top ${playerRankings.length}`);
  }

  // === 更新 Top Lady ===
  if (topLadies.length > 0) {
    const ladyRows = topLadies.map(p =>
      `                    <tr><td>${p.team}</td><td>${p.name}</td><td>${p.totalWins}</td></tr>`
    ).join('\n');

    html = html.replace(
      /<h3 class="section-title">Top Lady 🌹<\/h3>\s*<table class="ranking-table">[\s\S]*?<\/table>/,
      `<h3 class="section-title">Top Lady 🌹</h3>\n                <table class="ranking-table">\n                    <tr>\n                        <th>隊名</th>\n                        <th>姓名</th>\n                        <th>勝場數</th>\n                    </tr>\n${ladyRows}\n                </table>`
    );
    console.log(`  ✅ Top Lady：更新 Top ${topLadies.length}`);
  }

  // === 更新地獄倒霉鬼 ===
  if (unluckyPlayers.length > 0) {
    const unluckyRows = unluckyPlayers.map(p =>
      `                    <tr><td>${p.team}</td><td>${p.name}</td><td>${p.faRate}</td></tr>`
    ).join('\n');

    html = html.replace(
      /<th>先攻機率<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
      `<th>先攻機率</th>\n                    </tr>\n${unluckyRows}\n                </table>`
    );
    console.log(`  ✅ 地獄倒霉鬼：更新 Top ${unluckyPlayers.length}`);
  }

  // 加入本週新聞（插在最新 news-item 之前）
  const today = new Date();
  const newsDate = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;
  const gRange = `G${startG}~G${endG}`;

  const topTeam = teamRankings[0] || {};
  const topPlayer = playerRankings[0] || {};
  const newsBrief = weeklyGames.map(g =>
    `${g.awayTeam} ${g.awayScore}:${g.homeScore} ${g.homeTeam}`
  ).join('、');

  const newsHtml = `                <div class="news-item collapsible">
                    <div class="news-header expanded">
                        <div class="news-date">${newsDate}</div>
                        <div class="news-title">🎯 第六屆難找的聯賽 ${gRange} 週報：${topTeam.team || ''}持續領跑，${topPlayer.team || ''} ${topPlayer.name || ''}勝場稱王！</div>
                    </div>
                    <div class="news-text expanded">
                        各位選手與飛鏢同好們，本週賽事（${gRange}）圓滿結束！讓我們回顧本週戰況：
                        <br><br>
                        <strong>🏆 本週賽事結果</strong><br>
                        ${newsBrief}
                        <br><br>
                        <strong>📊 最新團隊排行</strong><br>
                        目前由 <strong>${topTeam.team || ''}</strong> 以 <strong>${topTeam.score || ''} 分</strong>領跑榜首。
                        <br><br>
                        <strong>👑 個人勝場王</strong><br>
                        ${topPlayer.team || ''} 的 <strong>${topPlayer.name || ''}</strong> 以 <strong>${topPlayer.totalWins || ''} 勝</strong>登頂個人榜。
                        <br><br>
                        <em>※ 本新聞由自動化腳本生成，賽事數據以官方公告為準</em>
                    </div>
                </div>\n`;

  html = html.replace(
    /<div class="news-content" id="newsContent">\s*<div class="news-item collapsible">/,
    `<div class="news-content" id="newsContent">\n${newsHtml}                <div class="news-item collapsible">`
  );

  fs.writeFileSync(CONFIG.newsHtmlPath, html, 'utf8');
  console.log(`  ✅ news.html 更新完成\n`);
}

// ===== 5. Git commit + push =====
function gitPush() {
  const { execSync } = require('child_process');
  const repoRoot = path.join(__dirname, '..');
  console.log('🚀 執行 git commit + push...\n');
  try {
    execSync('git add .', { cwd: repoRoot, stdio: 'inherit' });
    execSync(`git commit -m "📊 週報更新 G${startG}-G${endG}"`, { cwd: repoRoot, stdio: 'inherit' });
    execSync('git push', { cwd: repoRoot, stdio: 'inherit' });
    console.log('\n✅ Git push 完成！');
  } catch (err) {
    console.error('\n❌ Git 操作失敗:', err.message);
  }
}

// ===== 主流程 =====
async function main() {
  if (!isDryRun) {
    await writeToGoogleSheets();
    await fetchRankingsAndUpdateNews();
    if (!noPush) gitPush();
  } else {
    console.log('📊 Dry-run 模式，以下是計算結果：\n');
    weeklyGames.forEach(g => {
      console.log(`  ${g.gId}: ${g.awayTeam} ${g.awayScore}:${g.homeScore} ${g.homeTeam} | 勝: ${g.winner || '和局'}`);
    });
  }
  console.log('\n🎉 完成！');
}

main().catch(err => {
  console.error('❌ 執行失敗:', err);
  process.exit(1);
});
