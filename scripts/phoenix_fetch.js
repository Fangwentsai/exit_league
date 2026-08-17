#!/usr/bin/env node
/**
 * 更新聯賽選手的 PhoenixDarts Rating → data/phoenix_ratings.json
 *
 *   node scripts/phoenix_fetch.js            全部隊伍
 *   node scripts/phoenix_fetch.js 逃生Zoo口   只跑一隊
 *
 * 讀 data/phoenix_cards.json 的對照表，**一律用 cSeq 查**，不靠卡片名稱。
 *
 * 為什麼：卡片名稱隨時可能被本人改掉，用名字比對的話，改名的人會突然
 * 「查無此人」，而且沒辦法分辨是改名還是退隊。cSeq 是 PhoenixDarts 的
 * 會員編號，綁定當下就固定下來，之後怎麼改名都對得到。
 *
 * 也因此這支不需要掃店家排行榜了（排行榜只收錄近期有上機的人，本來就會
 * 漏掉沒打球的人）。個人檔案端點只吃 cSeq，隨時查得到當下的 Rating。
 * 每個人只要一次請求。
 *
 * 順帶偵測改名：myinfo 回傳的名字跟綁定時記的 card 不同就提示一聲，
 * 資料照樣更新——改名不影響正確性，只是提醒對照表裡的顯示名稱過時了。
 *
 * 為什麼是 Node 而不是瀏覽器：前台是靜態站，直接 fetch phoenixdarts.com
 * 會被 CORS 擋。這支在本機或排程跑，把結果寫成 JSON 進 repo，前端只讀檔。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

const HOST = 'www.phoenixdarts.com';
const DELAY_MS = 350;              // 對方是 Apache 2.2 + PHP 5.6 的老機器，客氣一點
const RATING_ICON_DIR = 'images/rating30';

const CARDS_PATH = path.join(__dirname, '../data/phoenix_cards.json');
const OUT_PATH = path.join(__dirname, '../data/phoenix_ratings.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function post(pathname, form) {
    const body = querystring.stringify(form);
    return new Promise((resolve, reject) => {
        const req = https.request({
            host: HOST, path: pathname, method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'yhdarts-league-bot/1.0 (+https://yhdarts.com)',
            },
        }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); }
                catch (e) { reject(new Error(`回應不是 JSON（HTTP ${res.statusCode}）：${d.slice(0, 120)}`)); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/** 個人檔案：當下的 Rating，不受期間限制，只吃 cSeq */
async function fetchProfile(cSeq) {
    const j = await post('/tw/mypage_user/myinfo/page/1', { c_seq: cSeq, csrf_hi_name: '' });
    return (j && j.myinfo) || null;
}

// 等級是 webrate 無條件捨去（6.01~6.99 都算 6）
function levelOf(webrate) {
    const n = parseFloat(webrate);
    if (!isFinite(n)) return null;
    return Math.max(1, Math.min(30, Math.floor(n)));
}

async function main() {
    const onlyTeam = process.argv[2];
    const cfg = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8'));
    const teams = Object.keys(cfg.teams || {}).filter(t => !onlyTeam || t === onlyTeam);

    if (!teams.length) {
        console.error(onlyTeam ? `❌ phoenix_cards.json 裡沒有「${onlyTeam}」` : '❌ 還沒有任何綁定資料');
        process.exit(1);
    }

    const out = { updatedAt: new Date().toISOString(), teams: {} };
    let ok = 0, failed = 0, renamed = 0;

    for (const team of teams) {
        console.log(`\n🔍 ${team}`);
        out.teams[team] = {};

        for (const [player, entry] of Object.entries(cfg.teams[team])) {
            if (!entry || !entry.cSeq) {
                console.warn(`   ⚠️ ${player}：沒有 cSeq，請重新在後台綁定`);
                failed++;
                continue;
            }

            let info;
            try {
                info = await fetchProfile(entry.cSeq);
            } catch (err) {
                console.warn(`   ⚠️ ${player}：查詢失敗（${err.message}）`);
                failed++;
                await sleep(DELAY_MS);
                continue;
            }
            await sleep(DELAY_MS);

            if (!info) {
                console.warn(`   ⚠️ ${player}：查無此帳號（cSeq ${entry.cSeq}），可能已被刪除`);
                failed++;
                continue;
            }

            const lv = levelOf(info.webrate);
            out.teams[team][player] = {
                card: info.name,                 // 以現在的名字為準，不是綁定當時的
                cardAtBind: entry.card,
                cSeq: entry.cSeq,
                homeShop: info.shopname,
                webrate: info.webrate,
                level: lv,
                icon: lv ? `${RATING_ICON_DIR}/${lv}.webp` : null,
                ppd: info.ppd_tapd,
                mpr: info.mpr_tapd,
            };
            ok++;

            // 比對要 trim：有人的卡片名稱前後帶空白（例如「 Molly 」），
            // 綁定時存的是修剪過的版本，直接比會每次都誤報改名
            const note = String(info.name).trim() !== String(entry.card).trim()
                ? `　（已改名，綁定時是「${entry.card}」）` : '';
            if (note) renamed++;
            console.log(`   ✅ ${player.padEnd(6)} ${info.name.padEnd(20)} Lv${String(lv).padStart(2)}  rate ${info.webrate}  PPD ${info.ppd_tapd}  MPR ${info.mpr_tapd}${note}`);
        }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
    console.log(`\n📄 已寫入 ${path.relative(process.cwd(), OUT_PATH)}`);
    console.log(`   成功 ${ok}　失敗 ${failed}${renamed ? `　改過名 ${renamed}` : ''}`);
}

main().catch(err => {
    console.error('❌ 執行失敗:', err.message);
    process.exit(1);
});
