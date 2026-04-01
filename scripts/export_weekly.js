const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const startG = parseInt(args[0]);
const endG = parseInt(args[1]);
const season = parseInt(args[2]) || 6;

if (!startG || !endG) {
    console.log("請輸入起始與結束的場次編號，例如：node export_weekly.js 49 54");
    process.exit(1);
}

const dir = path.join(__dirname, `../game_result/season${season}`);
const matchesData = [];
const allPlayersData = []; 

for (let i = startG; i <= endG; i++) {
    const file = path.join(dir, `g${i}.html`);
    if (!fs.existsSync(file)) {
        console.log(`找不到檔案: g${i}.html`);
        continue;
    }
    const html = fs.readFileSync(file, 'utf8');

    // 擷取日期
    const dateMatch = html.match(/<h2 class="match-date">(.*?)<\/h2>/);
    const matchDate = dateMatch ? dateMatch[1] : '';

    // 擷取比賽地點
    const venueMatch = html.match(/<div class="venue-info">(.*?)<\/div>/);
    const venue = venueMatch ? venueMatch[1] : '';

    // 擷取隊伍名稱
    const awayTeamMatch = html.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
    const awayTeam = awayTeamMatch ? awayTeamMatch[1] : 'Away';

    const homeTeamMatch = html.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
    const homeTeam = homeTeamMatch ? homeTeamMatch[1] : 'Home';

    // 擷取比賽資料 JS
    let matchesContent = html.match(new RegExp(`const g${i}Matches = (\\[[\\s\\S]*?\\]);`));
    let drinkingBonusContent = html.match(/const drinkingBonus = (\{.*?\});/);
    let awayPlayersContent = html.match(/const awayPlayers = (\[.*?\]);/);
    let homePlayersContent = html.match(/const homePlayers = (\[.*?\]);/);

    if (!matchesContent || !drinkingBonusContent || !awayPlayersContent || !homePlayersContent) {
        console.log(`跳過 g${i}.html - 缺乏完整的比賽資料結構`);
        continue;
    }

    let m, d, ap, hp;
    try {
        eval(`m = ${matchesContent[1]}`);
        eval(`d = ${drinkingBonusContent[1]}`);
        eval(`ap = ${awayPlayersContent[1]}`);
        eval(`hp = ${homePlayersContent[1]}`);
    } catch(e) {
        console.log(`解析 g${i}.html 中的 JS 發生錯誤`, e.message);
        continue;
    }

    // 計算分數
    let ab=0, hb=0, pts=[0,1,1,1,1,3,1,1,1,1,3,2,2,2,2,4,4];
    m.forEach(x => {
        if (x.winner==='away') ab+=pts[x.set];
        else hb+=pts[x.set];
    });
    let aw = ab > hb ? 1 : 0;
    let hw = hb > ab ? 1 : 0;
    
    let totalAway = ab + aw + d.away;
    let totalHome = hb + hw + d.home;

    // 勝負依「比賽成績」(ab vs hb) 判定，不含飲酒加成
    let winner = ab > hb ? awayTeam : (hb > ab ? homeTeam : '');
    let loser = ab > hb ? homeTeam : (hb > ab ? awayTeam : '');
    let draw = ab === hb ? 'Y' : '';

    // 飲酒加成：分別列出客場/主場的加成數值
    let drinkAway = d.away > 0 ? `${awayTeam}` : '';
    let drinkHome = d.home > 0 ? `${homeTeam}` : '';
    let drunkDisplay = [drinkAway, drinkHome].filter(Boolean).join(' & ');

    matchesData.push({
        gId: `G${i}`, date: matchDate, 
        awayTeam, awayScore: totalAway, homeScore: totalHome, homeTeam, 
        venue, winner, loser, drunk: drunkDisplay, draw
    });

    // 計算選手數據
    let pStats = {};
    ap.forEach(p => pStats[p] = {team: awayTeam, date: matchDate, p01:0, w01:0, pCR:0, wCR:0, total:0, wins:0, fa:0});
    hp.forEach(p => pStats[p] = {team: homeTeam, date: matchDate, p01:0, w01:0, pCR:0, wCR:0, total:0, wins:0, fa:0});

    m.forEach(x => {
        let isHomeFirst = x.firstAttack === 'home';
        let ap_m = Array.isArray(x.away) ? x.away : [x.away];
        let hp_m = Array.isArray(x.home) ? x.home : [x.home];
        
        ap_m.forEach(p => {
            if(!pStats[p]) return;
            if(!isHomeFirst) pStats[p].fa++;
            if(x.type==='01') {
                pStats[p].p01++; pStats[p].total++;
                if(x.winner==='away') { pStats[p].w01++; pStats[p].wins++; }
            } else {
                pStats[p].pCR++; pStats[p].total++;
                if(x.winner==='away') { pStats[p].wCR++; pStats[p].wins++; }
            }
        });

        hp_m.forEach(p => {
            if(!pStats[p]) return;
            if(isHomeFirst) pStats[p].fa++;
            if(x.type==='01') {
                pStats[p].p01++; pStats[p].total++;
                if(x.winner==='home') { pStats[p].w01++; pStats[p].wins++; }
            } else {
                pStats[p].pCR++; pStats[p].total++;
                if(x.winner==='home') { pStats[p].wCR++; pStats[p].wins++; }
            }
        });
    });

    allPlayersData.push({team: awayTeam, date: matchDate, stats: Object.keys(pStats).filter(k=>pStats[k].team===awayTeam).map(k=>({name: k, ...pStats[k]}))});
    allPlayersData.push({team: homeTeam, date: matchDate, stats: Object.keys(pStats).filter(k=>pStats[k].team===homeTeam).map(k=>({name: k, ...pStats[k]}))});
}

// 輸出每週賽事結果 CSV
let mCsv = "遊戲編號,日期,客場,客場分數,vs,主場分數,主場,比賽地點,勝,敗,酒,和局\n";
matchesData.forEach(d => {
    mCsv += `${d.gId},${d.date},${d.awayTeam},${d.awayScore},vs,${d.homeScore},${d.homeTeam},${d.venue},${d.winner},${d.loser},${d.drunk},${d.draw}\n`;
});
fs.writeFileSync(path.join(__dirname, 'weekly_matches.csv'), "\ufeff" + mCsv, 'utf8');

// 輸出選手數據 CSV
let pCsv = "";
allPlayersData.forEach(teamData => {
    pCsv += `${teamData.date},,,,,,,,\n`;
    pCsv += `選手,01出賽,01勝場,CR出賽,CR勝場,合計出賽,合計勝場,先攻數\n`;
    teamData.stats.forEach(s => {
        pCsv += `${s.name},${s.p01},${s.w01},${s.pCR},${s.wCR},${s.total},${s.wins},${s.fa}\n`;
    });
});
fs.writeFileSync(path.join(__dirname, 'weekly_players.csv'), "\ufeff" + pCsv, 'utf8');

console.log(`成功匯出資料至：`);
console.log(`  - ${path.join(__dirname, 'weekly_matches.csv')}`);
console.log(`  - ${path.join(__dirname, 'weekly_players.csv')}`);
