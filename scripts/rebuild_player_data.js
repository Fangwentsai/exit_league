#!/usr/bin/env node
// 重建某一屆 data 分頁的內容（01/CR 拆分用正確規則重算）。
//
// 背景：部署中的 Apps Script 曾用 SET 編號硬判 Cricket 且條件只寫 6~10，
// 導致 SET13/14/16 被算成 01。合計場次與勝場沒錯，只有 01/CR 拆分要補正。
//
// 版面完全照 gas_complete_code.js 寫入 data 分頁的格式，每場一個區塊：
//   空列 / 日期 / 表頭 / 客隊選手 / 表頭 / 主隊選手
// 選手順序沿用各頁 awayPlayers、homePlayers 的原始順序。
//
// 用法：node scripts/rebuild_player_data.js <season> [輸出檔]
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { isCricket } = require('./set_types.js');

const HEADER = ['選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數'];

function readGame(file) {
    const src = fs.readFileSync(file, 'utf8');
    const arr = src.match(/const (\w+) = \[[\s\S]*?\];/);
    if (!arr) return null;
    const ctx = vm.createContext({});
    vm.runInContext(arr[0], ctx);
    for (const re of [/const awayPlayers = \[[^\]]*\];/, /const homePlayers = \[[^\]]*\];/,
                      /const matchMeta = \{[\s\S]*?\n\};/]) {
        const m = src.match(re);
        if (!m) return null;
        vm.runInContext(m[0], ctx);
    }
    return {
        matches: vm.runInContext(arr[1], ctx),
        away: vm.runInContext('awayPlayers', ctx),
        home: vm.runInContext('homePlayers', ctx),
        meta: vm.runInContext('matchMeta', ctx),
    };
}

// 回傳 { name: {p01,w01,pCR,wCR,total,wins,fa} }，只算這一隊
function tally(matches, side) {
    const st = {};
    for (const m of matches) {
        const cr = isCricket(m);
        const names = Array.isArray(m[side]) ? m[side] : [m[side]];
        for (const name of names) {
            const s = st[name] = st[name] || { p01: 0, w01: 0, pCR: 0, wCR: 0, total: 0, wins: 0, fa: 0 };
            if (cr) s.pCR++; else s.p01++;
            s.total++;
            if (m.winner === side) { if (cr) s.wCR++; else s.w01++; s.wins++; }
            if (m.firstAttack === side) s.fa++;
        }
    }
    return st;
}

function build(season) {
    const dir = path.join('game_result', 'season' + season);
    const files = fs.readdirSync(dir).filter(f => /^g\d+\.html$/.test(f))
        .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    const rows = [HEADER.slice()];
    let games = 0, skipped = [];
    for (const f of files) {
        const g = readGame(path.join(dir, f));
        if (!g) { skipped.push(f); continue; }
        games++;
        rows.push(['', '', '', '', '', '', '', '']);
        rows.push([g.meta.date, '', '', '', '', '', '', '']);
        for (const [side, roster] of [['away', g.away], ['home', g.home]]) {
            const st = tally(g.matches, side);
            rows.push(HEADER.slice());
            // 先照名單順序，名單沒列到但有上場的補在後面（不漏人）
            const ordered = roster.filter(n => st[n]).concat(Object.keys(st).filter(n => roster.indexOf(n) === -1));
            for (const n of ordered) {
                const s = st[n];
                rows.push([n, s.p01, s.w01, s.pCR, s.wCR, s.total, s.wins, s.fa]);
            }
        }
    }
    return { rows, games, skipped };
}

const season = process.argv[2];
if (!season) { console.error('用法：node scripts/rebuild_player_data.js <season> [輸出檔]'); process.exit(1); }
const out = process.argv[3] || `season${season}_data.tsv`;
const { rows, games, skipped } = build(season);
fs.writeFileSync(out, rows.map(r => r.join('\t')).join('\n') + '\n', 'utf8');
console.log(`第${season}屆：${games} 場 → ${rows.length} 列，已寫入 ${out}`);
if (skipped.length) console.log('跳過（抓不到資料）：' + skipped.join(', '));
