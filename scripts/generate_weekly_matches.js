const fs = require('fs');
const path = require('path');

const gameResultDir = path.join(__dirname, '../game_result/season6');
const outputCsv = path.join(__dirname, '../weekly_matches.csv');
const SET_POINTS = [0, 1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4];

function parseGameHtml(gameNum) {
    const gStr = gameNum.toString().padStart(2, '0');
    let file = path.join(gameResultDir, `g${gStr}.html`);
    if (!fs.existsSync(file)) {
        file = path.join(gameResultDir, `g${gameNum}.html`);
        if (!fs.existsSync(file)) return null;
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

    // 比賽資料
    const matchesStr = html.match(/const g\d+Matches = (\[[\s\S]*?\]);/);
    const drinkStr = html.match(/const drinkingBonus = (\{.*?\});/);

    if (!matchesStr || !drinkStr) return null;

    let m, d;
    try {
        m = eval('(' + matchesStr[1] + ')');
        d = eval('(' + drinkStr[1] + ')');
    } catch (e) {
        return null;
    }

    let ab = 0, hb = 0;
    m.forEach(x => {
        const pts = SET_POINTS[x.set] || 0;
        if (x.winner === 'away') ab += pts;
        else if (x.winner === 'home') hb += pts;
    });

    // 嚴格按照 weekly_update 的勝負邏輯：純看原始得分 (ab vs hb)
    const aw = ab > hb ? 1 : 0;
    const hw = hb > ab ? 1 : 0;
    const totalAway = ab + aw + d.away;
    const totalHome = hb + hw + d.home;
    const winner = ab > hb ? awayTeam : (hb > ab ? homeTeam : '');
    const loser = ab > hb ? homeTeam : (hb > ab ? awayTeam : '');
    const draw1 = ab === hb ? awayTeam : '';
    const draw2 = ab === hb ? homeTeam : '';

    // 飲酒紀錄
    const drunkParts = [];
    if (d.away > 0) drunkParts.push(awayTeam);
    if (d.home > 0) drunkParts.push(homeTeam);
    const drunk = drunkParts.join(' & ');

    return {
        gId: `G${gStr}`,
        date: matchDate,
        awayTeam, awayScore: totalAway,
        homeScore: totalHome, homeTeam,
        venue, winner, loser, drunk, draw1, draw2
    };
}

let mCsv = '\ufeff遊戲編號,日期,客場,客場分數,vs,主場分數,主場,比賽地點,勝,敗,酒,和局,和局\n';

for (let i = 1; i <= 114; i++) {
    const d = parseGameHtml(i);
    if (d) {
        mCsv += `${d.gId},${d.date},${d.awayTeam},${d.awayScore},vs,${d.homeScore},${d.homeTeam},${d.venue},${d.winner},${d.loser},${d.drunk},${d.draw1},${d.draw2}\n`;
    }
}

fs.writeFileSync(outputCsv, mCsv, 'utf8');
console.log('✅ 已成功生成 weekly_matches.csv');
