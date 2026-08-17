#!/usr/bin/env node
/**
 * 建立 PhoenixDarts 選手搜尋索引 → data/phoenix_players.json
 *                 店家地址對照 → data/phoenix_shops.json
 *
 *   node scripts/phoenix_index.js          # 全部重建
 *   node scripts/phoenix_index.js --shops  # 只更新店家地址
 *
 * 為什麼要「預先建索引」而不是搜尋時即時查：
 * PhoenixDarts 沒有「用名字搜尋選手」的端點，只能一頁一頁列排行榜再自己過濾。
 * 使用者每打一個字就翻幾百頁顯然不可行——對方是 Apache 2.2 + PHP 5.6 的老機器，
 * 而且瀏覽器直接打他們的網域會被 CORS 擋。所以改成離線先把名單抓成一份靜態
 * JSON，綁定頁在本機記憶體裡搜尋，零延遲、也不會一直騷擾人家。
 *
 * 代價是索引有時效：只收錄「今日／昨日／本月／上個月有上機」的人。
 * 新辦卡或很久沒打的人不在裡面，重跑這支就會補上。
 *
 * 店家地址是給綁定頁排序用的（中和永和 > 其他新北 > 台北 > 其他）。
 * 排行榜只給店名，地址要另外用店鋪搜尋頁查，所以查過就存起來重複利用。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

const HOST = 'www.phoenixdarts.com';
const DELAY_MS = 300;
const PLAYERS_OUT = path.join(__dirname, '../data/phoenix_players.json');
const SHOPS_OUT = path.join(__dirname, '../data/phoenix_shops.json');

const GAMES = [3, 1, 2, 4, 6, 5];
const PERIODS = [0, 1, 2, 3];
const MAX_PAGES = 20;          // 實測單一組合最多 9 頁，留一倍餘裕

// 只保留雙北的選手（areaRank 0=中永和、1=其他新北、2=台北市）。
// 全國掃出來有 3645 人、528KB，但這是綁定頁要載入的檔案，而聯賽在永和，
// 隊員的卡片幾乎不可能出自外縣市——留著只是讓每個隊長多下載 300KB。
// 篩完剩約 1240 人、180KB。
//
// 掃描本身仍然掃全國：排行榜沒有「只列某縣市」的可靠參數，而且要先拿到
// 店名才查得到地址，所以是先全掃、最後才篩。
// 真的有外縣市的隊員時，把這個值改成 9 重跑就會全部留下。
const KEEP_AREA_RANK = 2;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function request(method, pathname, form) {
    const body = form ? querystring.stringify(form) : null;
    const headers = { 'User-Agent': 'yhdarts-league-bot/1.0 (+https://yhdarts.com)' };
    if (body) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers['Content-Length'] = Buffer.byteLength(body);
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    return new Promise((resolve, reject) => {
        const req = https.request({ host: HOST, path: pathname, method, headers }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function rankPage(rankcode, period, page) {
    const raw = await request('POST', `/tw/ranking/getAreaRankingList/page/${page}`, {
        rankcode, period, onlyclass: '', area: '', rstatus: '0',
        sex: '0', flag: '1', areacode: '', s_seq: '',
    });
    try { return JSON.parse(raw).list_data || []; }
    catch (e) { throw new Error(`排行榜回應不是 JSON：${raw.slice(0, 120)}`); }
}

/** 從店鋪搜尋頁把地址挖出來。回傳 { 店名: 地址 } */
async function lookupShop(name) {
    const html = await request('GET', '/tw/shop/shopSearch?keyword=' + encodeURIComponent(name));
    // 版面是 <a href="...s_seq=N"> … alt="店名" … <dd>地址</dd>
    const re = /shopDetail\?s_seq=(\d+)"[\s\S]{0,1200}?alt="([^"]*)"[\s\S]{0,1200}?((?:臺北市|台北市|新北市|桃園市|台中市|臺中市|台南市|臺南市|高雄市|基隆市|新竹|苗栗|彰化|南投|雲林|嘉義|屏東|宜蘭|花蓮|台東|臺東)[^<\n]{0,40})/g;
    let m;
    while ((m = re.exec(html))) {
        if (m[2].trim() === name.trim()) return { sSeq: m[1], address: m[3].trim() };
    }
    return null;
}

// 綁定頁的排序權重：自家聯賽在永和，所以中永和最優先
function areaRank(address) {
    if (!address) return 9;
    if (/(中和區|永和區)/.test(address)) return 0;
    if (/新北市/.test(address)) return 1;
    if (/(臺北市|台北市)/.test(address)) return 2;
    return 3;
}

async function buildPlayers() {
    const byCSeq = new Map();
    let reqs = 0;

    for (const rankcode of GAMES) {
        for (const period of PERIODS) {
            for (let page = 1; page <= MAX_PAGES; page++) {
                const list = await rankPage(rankcode, period, page);
                reqs++;
                for (const row of list) {
                    // 同一人會出現在多個榜。webrate 都一樣，取第一次見到的即可，
                    // 但主店偶爾會有空值，所以有值就補上
                    const cur = byCSeq.get(row.c_seq);
                    if (!cur) {
                        byCSeq.set(row.c_seq, {
                            cSeq: row.c_seq,
                            card: row.name.trim(),
                            webrate: row.webrate,
                            level: parseInt(row.class_num_30) || null,
                            shop: row.shopname,
                        });
                    } else if (!cur.shop && row.shopname) {
                        cur.shop = row.shopname;
                    }
                }
                if (list.length < 100) break;
                await sleep(DELAY_MS);
            }
            process.stdout.write(`\r   遊戲 ${rankcode} 期間 ${period}：累計 ${byCSeq.size} 人（${reqs} 次請求）    `);
        }
    }
    console.log('');
    return [...byCSeq.values()];
}

async function buildShops(players, existing) {
    const shops = { ...existing };
    const names = [...new Set(players.map(p => p.shop).filter(Boolean))];
    const todo = names.filter(n => !shops[n]);
    console.log(`   店家共 ${names.length} 家，其中 ${todo.length} 家還沒有地址`);

    let done = 0;
    for (const name of todo) {
        try {
            const info = await lookupShop(name);
            shops[name] = info
                ? { sSeq: info.sSeq, address: info.address, areaRank: areaRank(info.address) }
                : { sSeq: null, address: null, areaRank: 9 };   // 查不到也記下來，下次不用重查
        } catch (e) {
            shops[name] = { sSeq: null, address: null, areaRank: 9 };
        }
        done++;
        if (done % 10 === 0) process.stdout.write(`\r   查詢店家地址 ${done}/${todo.length}    `);
        await sleep(DELAY_MS);
    }
    console.log('');
    return shops;
}

async function main() {
    const shopsOnly = process.argv.includes('--shops');
    const existingShops = fs.existsSync(SHOPS_OUT)
        ? JSON.parse(fs.readFileSync(SHOPS_OUT, 'utf8')).shops || {}
        : {};

    let players;
    if (shopsOnly && fs.existsSync(PLAYERS_OUT)) {
        players = JSON.parse(fs.readFileSync(PLAYERS_OUT, 'utf8')).players;
        console.log(`📇 沿用既有的 ${players.length} 位選手索引`);
    } else {
        console.log('📇 掃描全國排行榜（6 種遊戲 × 4 種期間）…');
        players = await buildPlayers();
        console.log(`   收集到 ${players.length} 位選手`);
    }

    console.log('\n🏠 補齊店家地址…');
    const shops = await buildShops(players, existingShops);

    // 只把排序權重併進選手資料。地址不要跟著每一筆重複存——3645 筆各存一份
    // 會讓索引多出 100KB 以上，而綁定頁顯示只需要店名，地址查 phoenix_shops.json 就有。
    for (const p of players) {
        const s = shops[p.shop];
        p.areaRank = s ? s.areaRank : 9;
    }

    const before = players.length;
    players = players.filter(p => p.areaRank <= KEEP_AREA_RANK);
    console.log(`\n✂️  只保留雙北：${before} → ${players.length} 人`);

    players.sort((a, b) => a.areaRank - b.areaRank || (b.level || 0) - (a.level || 0));

    fs.writeFileSync(PLAYERS_OUT, JSON.stringify({ updatedAt: new Date().toISOString(), players }, null, 1) + '\n');
    fs.writeFileSync(SHOPS_OUT, JSON.stringify({ updatedAt: new Date().toISOString(), shops }, null, 2) + '\n');

    const byArea = players.reduce((a, p) => (a[p.areaRank] = (a[p.areaRank] || 0) + 1, a), {});
    console.log(`\n📄 ${path.relative(process.cwd(), PLAYERS_OUT)}　${players.length} 人`);
    console.log(`📄 ${path.relative(process.cwd(), SHOPS_OUT)}　${Object.keys(shops).length} 家店`);
    console.log(`   中永和 ${byArea[0] || 0}　其他新北 ${byArea[1] || 0}　台北 ${byArea[2] || 0}　其他 ${(byArea[3] || 0) + (byArea[9] || 0)}`);
}

main().catch(err => { console.error('❌ 失敗:', err.message); process.exit(1); });
