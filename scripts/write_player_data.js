/**
 * 從 game_result HTML 解析選手數據，POST 到 GAS 寫入 data sheet
 */
const https = require('https');
const fs = require('fs');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwJ3xPlfON7pkmeVKzpQImQhnlzpMz6Fn4Z1E7PwXVBZBvlncA7VCQ3tITyq9x8puAu/exec';

function httpsGet(url) {
  return new Promise((ok, no) => {
    https.get(new URL(url), r => {
      if (r.statusCode === 302 || r.statusCode === 301) return httpsGet(r.headers.location).then(ok).catch(no);
      let b = ''; r.on('data', c => b += c); r.on('end', () => ok(b));
    }).on('error', no);
  });
}

function httpsPost(url, data) {
  return new Promise((ok, no) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, r => {
      if (r.statusCode === 302 || r.statusCode === 301) return httpsGet(r.headers.location).then(ok).catch(no);
      let s = ''; r.on('data', c => s += c); r.on('end', () => ok(s));
    });
    req.on('error', no);
    req.setTimeout(120000, () => { req.destroy(); no(new Error('Timeout')); });
    req.write(body); req.end();
  });
}

/**
 * 從 HTML 解析 match 數據並計算每位選手的統計
 */
function parsePlayerStatsFromHtml(html) {
  // 取得隊名
  const awayMatch = html.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
  const homeMatch = html.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
  const awayTeam = awayMatch ? awayMatch[1].trim() : '';
  const homeTeam = homeMatch ? homeMatch[1].trim() : '';

  // 取得 match data（JS 變數）
  const matchDataStr = html.match(/const \w+Matches = \[([\s\S]*?)\];/);
  if (!matchDataStr) return null;

  // 安全 eval
  let matches;
  try {
    matches = eval('[' + matchDataStr[1] + ']');
  } catch (e) {
    console.error('  ❌ eval error:', e.message);
    return null;
  }

  // 計算每位選手統計
  const stats = {}; // key: "away:name" or "home:name"

  for (const m of matches) {
    const type = m.type; // '01' or 'CR'
    const sides = ['away', 'home'];
    
    for (const side of sides) {
      let players = m[side];
      if (!Array.isArray(players)) players = [players];
      
      for (const name of players) {
        const key = side + ':' + name;
        if (!stats[key]) {
          stats[key] = { name, side, p01: 0, w01: 0, pCR: 0, wCR: 0, total: 0, wins: 0, fa: 0 };
        }
        const s = stats[key];
        
        if (type === '01') { s.p01++; } else { s.pCR++; }
        s.total++;
        
        if (m.winner === side) {
          if (type === '01') { s.w01++; } else { s.wCR++; }
          s.wins++;
        }
        
        if (m.firstAttack === side) {
          s.fa++;
        }
      }
    }
  }

  // 分成 away/home 陣列
  const awayStats = Object.values(stats).filter(s => s.side === 'away').map(s => ({
    name: s.name, p01: s.p01, w01: s.w01, pCR: s.pCR, wCR: s.wCR, total: s.total, wins: s.wins, fa: s.fa
  }));
  const homeStats = Object.values(stats).filter(s => s.side === 'home').map(s => ({
    name: s.name, p01: s.p01, w01: s.w01, pCR: s.pCR, wCR: s.wCR, total: s.total, wins: s.wins, fa: s.fa
  }));

  return { awayTeam, homeTeam, awayStats, homeStats };
}

async function main() {
  const games = ['g103', 'g105', 'g106', 'g108'];
  
  for (const g of games) {
    const htmlPath = `/Users/jessetsai_mba/Cursor/exit_league/game_result/season6/${g}.html`;
    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    console.log(`\n📤 ${g.toUpperCase()} 解析選手數據...`);
    const result = parsePlayerStatsFromHtml(html);
    if (!result) { console.log('  ❌ 解析失敗'); continue; }
    
    console.log(`  客場 ${result.awayTeam}: ${result.awayStats.length} 人`);
    result.awayStats.forEach(p => console.log(`    ${p.name}: 01=${p.w01}/${p.p01} CR=${p.wCR}/${p.pCR} 勝=${p.wins}/${p.total} 先攻=${p.fa}`));
    console.log(`  主場 ${result.homeTeam}: ${result.homeStats.length} 人`);
    result.homeStats.forEach(p => console.log(`    ${p.name}: 01=${p.w01}/${p.p01} CR=${p.wCR}/${p.pCR} 勝=${p.wins}/${p.total} 先攻=${p.fa}`));
    
    // POST 到 GAS 寫入 data sheet
    console.log(`  📝 寫入 data sheet...`);
    const payload = {
      gameId: g,
      htmlContent: '',  // 不需要重新上傳 HTML
      awayTeam: result.awayTeam,
      homeTeam: result.homeTeam,
      playerStats: { away: result.awayStats, home: result.homeStats },
      gameDate: '',
      writeDataOnly: true,  // 標記：只寫 data，不要重跑整個流程
      timestamp: new Date().toISOString()
    };
    
    try {
      const r = await httpsPost(GAS_URL, payload);
      const parsed = JSON.parse(r);
      console.log(`  → ${parsed.status}: ${parsed.message || ''}`);
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
    }
  }
}

main().catch(e => console.error('Fatal:', e.message));
