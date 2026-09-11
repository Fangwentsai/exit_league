#!/usr/bin/env node
/**
 * build_all_seasons.js — 把已結束賽季的 personal 原始數據整理成一份
 * 靜態的跨屆生涯數據檔 data/all_seasons.json。
 *
 * 使用方式：
 *   node scripts/build_all_seasons.js
 *
 * 設計重點：
 *   - 只烘進「已經打完」的賽季（目前是 4、5、6 屆）。第七屆還在進行中，
 *     刻意不寫進這份靜態檔——生涯頁面載入時會即時打第七屆的 API 補上最新
 *     數據，跟現在網站上其他排行榜頁面的做法一致，不用每週手動重跑這支腳本。
 *     等第七屆真的打完，把 4 改成 [4,5,6,7]、season 7 從即時抓改成烘進來，
 *     第八屆變成新的「進行中」賽季，重複同樣的模式。
 *   - 用「姓名」當作跨屆比對同一位選手的 key（這個聯賽沒有選手 ID 系統，
 *     姓名是目前唯一可用的識別依據；如果之後真的出現同名不同人的狀況，
 *     要另外處理，但目前資料裡沒觀察到這個問題）。
 *   - personal!A:N 欄位結構在 4~7 屆完全一致（隊伍/姓名/01勝場/01勝率/
 *     CR勝場/CR勝率/總勝場/總勝率/先攻率/01場次/CR場次/先攻數/總場數/
 *     Gender），四屆共用同一套解析邏輯，不需要為每屆寫不同的欄位對照。
 */

const fs = require('fs');
const path = require('path');

// 讀 config/config.js 拿每屆的 sheetId / apiKey（純腳本沒有 module.exports，
// 用 Function 取出裡面的 SEASONS 常數即可，跟 weekly_update.js 的做法一致）
function loadSeasons() {
  const src = fs.readFileSync(path.join(__dirname, '../config/config.js'), 'utf8');
  const SEASONS = new Function(src + '\nreturn SEASONS;')();
  return SEASONS;
}

// 讀 config/player_aliases.js，把「姓名＋隊伍」查得到的改名對照表整理成
// Map，key 是 `姓名|隊伍`，value 是 { id, canonicalName }，供 parseRow 之後
// 判斷這筆資料要歸到哪個生涯身分底下。
function loadAliasLookup() {
  const src = fs.readFileSync(path.join(__dirname, '../config/player_aliases.js'), 'utf8');
  const PLAYER_ALIASES = new Function(src + '\nreturn PLAYER_ALIASES;')();
  const lookup = new Map();
  for (const group of PLAYER_ALIASES) {
    for (const identity of group.identities) {
      lookup.set(`${identity.name}|${identity.team}`, { id: group.id, canonicalName: group.canonicalName });
    }
  }
  return lookup;
}

// 目前只烘進已結束的賽季。第七屆還在進行中，故意不放進來（見檔頭說明）。
const BAKED_SEASON_NUMBERS = [4, 5, 6];

async function fetchPersonalSheet(sheetId, apiKey) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/personal!A1:N300?key=${apiKey}`;
  const res = await fetch(url, { headers: { Referer: 'https://yhdarts.com/' } });
  if (!res.ok) {
    throw new Error(`讀取失敗 (HTTP ${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.values || [];
}

// 把一列 personal 原始資料轉成結構化物件。A:N 欄位順序在 4~7 屆完全一致。
function parseRow(row) {
  const team = (row[0] || '').trim();
  const name = (row[1] || '').trim();
  if (!team || !name) return null;

  const numOrNull = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  };
  const pctOrNull = (v) => {
    if (v === undefined || v === null || v === '' || String(v).trim() === 'DNP') return null;
    const n = parseFloat(String(v).replace('%', ''));
    return Number.isNaN(n) ? null : n;
  };

  return {
    team,
    name,
    wins01: numOrNull(row[2]),
    rate01: pctOrNull(row[3]),
    winsCR: numOrNull(row[4]),
    rateCR: pctOrNull(row[5]),
    totalWins: numOrNull(row[6]),
    totalRate: pctOrNull(row[7]),
    firstRate: pctOrNull(row[8]),
    games01: numOrNull(row[9]),
    gamesCR: numOrNull(row[10]),
    firstCount: numOrNull(row[11]),
    totalGames: numOrNull(row[12]),
    gender: (row[13] || '').trim() || null,
  };
}

async function main() {
  const SEASONS = loadSeasons();
  const aliasLookup = loadAliasLookup();
  const result = {
    generatedAt: new Date().toISOString(),
    bakedSeasons: BAKED_SEASON_NUMBERS,
    seasons: {},
    players: {},
  };

  for (const num of BAKED_SEASON_NUMBERS) {
    const season = SEASONS[num];
    if (!season) {
      console.warn(`⚠️ config.js 裡找不到第 ${num} 屆設定，跳過`);
      continue;
    }
    console.log(`📥 抓取第 ${num} 屆（${season.label}）personal 資料...`);
    const rows = await fetchPersonalSheet(season.sheetId, season.apiKey);
    const dataRows = rows.slice(1); // 第一列是表頭

    result.seasons[num] = { label: season.label, playerCount: 0 };

    let count = 0;
    for (const row of dataRows) {
      const parsed = parseRow(row);
      if (!parsed) continue;
      count++;

      // 先查這筆「姓名＋隊伍」是不是已知的改名案例（見 config/player_aliases.js），
      // 是的話歸到該生涯身分底下（用 alias id 當 key，不用顯示名字，避免跟
      // 未列入 alias 的同名不同人衝突），不是的話照舊用姓名當 key。
      const alias = aliasLookup.get(`${parsed.name}|${parsed.team}`);
      const playerKey = alias ? `__alias__${alias.id}` : parsed.name;
      const displayName = alias ? alias.canonicalName : parsed.name;

      if (!result.players[playerKey]) {
        result.players[playerKey] = { name: displayName, seasons: {} };
      }
      // 同一屆同一個身分出現超過一次，實測發現（在沒有 alias 對照的狀況下）
      // 全部都是「不同隊的不同人剛好同名/同暱稱」，不是重複列（例如第四屆
      // 有兩個「小孟」，一個在人生揪難、一個在海盜揪硬，勝場數也不一樣）。
      // 這個聯賽沒有選手 ID 系統，姓名是唯一識別依據，直接覆蓋會憑空弄丟
      // 其中一人的資料——改成每屆存成陣列，允許同一屆有多筆（正好對應職棒
      // 選手名鑑「球季中被交易、同一年列兩行」的呈現方式，player.html 那邊
      // 可以直接比照辦理）。
      const entry = {
        team: parsed.team,
        wins01: parsed.wins01,
        rate01: parsed.rate01,
        winsCR: parsed.winsCR,
        rateCR: parsed.rateCR,
        totalWins: parsed.totalWins,
        totalRate: parsed.totalRate,
        firstRate: parsed.firstRate,
        games01: parsed.games01,
        gamesCR: parsed.gamesCR,
        firstCount: parsed.firstCount,
        totalGames: parsed.totalGames,
        gender: parsed.gender,
      };
      if (!result.players[playerKey].seasons[num]) {
        result.players[playerKey].seasons[num] = [entry];
      } else {
        result.players[playerKey].seasons[num].push(entry);
        console.warn(`ℹ️ 第 ${num} 屆「${displayName}」出現在多支隊伍（${result.players[playerKey].seasons[num].map(e => e.team).join('、')}），已個別保留，未覆蓋`);
      }
    }
    result.seasons[num].playerCount = count;
    console.log(`  ✅ 第 ${num} 屆：${count} 位選手`);
  }

  const playerNames = Object.keys(result.players);
  console.log(`\n📊 總計 ${playerNames.length} 位不重複姓名，跨 ${BAKED_SEASON_NUMBERS.length} 屆`);

  const outPath = path.join(__dirname, '../data/all_seasons.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n✅ 已寫入 ${outPath}`);
}

main().catch((err) => {
  console.error('❌ build_all_seasons 失敗:', err);
  process.exit(1);
});
