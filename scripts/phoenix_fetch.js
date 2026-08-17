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
 * 【隱私帳號的備援：改查排行榜】
 * 有一部分會員的 myinfo 完全不回傳資料（連 name 都是空字串，實測同一個 cSeq
 * 連查三次都一樣，同店其他人正常，所以不是速率限制）。但**排行榜不受這個限制**
 * ——只要那張卡近期有上機，rate 就照樣公開顯示。實測 Jack Bar 的六個隱私帳號
 * 在店家排行榜上全部查得到 rate。
 *
 * 所以取值順序是：myinfo → 現查店家排行榜 → 本地索引（phoenix_players.json）。
 * 排行榜要放在索引之前：索引是離線建的，隔幾天就過時；排行榜是當下的值。
 * PPD／MPR 只有 myinfo 有，隱私帳號就是拿不到，維持標記為無資料。
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
const PLAYERS_INDEX_PATH = path.join(__dirname, '../data/phoenix_players.json');
const SHOPS_PATH = path.join(__dirname, '../data/phoenix_shops.json');

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

const GAMES = [3, 1, 2, 4, 6, 5];
const PERIODS = [2, 3, 0, 1];      // 先問本月、上個月，命中率最高

/**
 * 用店家排行榜補 rate。傳入店家編號與想找的 cSeq 集合，回傳 Map<cSeq, row>。
 *
 * 一個人的 webrate 在每一張榜上都是同一個值，所以找到一次就夠，不必掃完；
 * 全部找齊就提早結束。實測一家店通常 1~3 次請求就能撈到。
 */
async function fetchFromRanking(sSeq, wanted) {
    const found = new Map();
    for (const rankcode of GAMES) {
        for (const period of PERIODS) {
            const j = await post('/tw/ranking/getAreaRankingList/page/1', {
                rankcode, period, onlyclass: '', area: '', rstatus: '0',
                sex: '0', flag: '1', areacode: '', s_seq: sSeq,
            });
            for (const row of (j.list_data || [])) {
                if (wanted.has(row.c_seq) && !found.has(row.c_seq)) found.set(row.c_seq, row);
            }
            await sleep(DELAY_MS);
            if (found.size === wanted.size) return found;
        }
    }
    return found;
}

// 等級是 webrate 無條件捨去（6.01~6.99 都算 6）
function levelOf(webrate) {
    const n = parseFloat(webrate);
    if (!isFinite(n) || n <= 0) return null;
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

    let playerIndexMap = new Map();
    if (fs.existsSync(PLAYERS_INDEX_PATH)) {
        try {
            const idxJson = JSON.parse(fs.readFileSync(PLAYERS_INDEX_PATH, 'utf8'));
            (idxJson.players || []).forEach(p => playerIndexMap.set(String(p.cSeq), p));
        } catch(e) {}
    }

    let shopMap = {};
    if (fs.existsSync(SHOPS_PATH)) {
        try { shopMap = JSON.parse(fs.readFileSync(SHOPS_PATH, 'utf8')).shops || {}; } catch (e) {}
    }

    const out = { updatedAt: new Date().toISOString(), teams: {} };
    let ok = 0, failed = 0, renamed = 0, hidden = 0;
    // 第一輪先記下哪些人的 myinfo 是空的，第二輪再用排行榜補
    const needRanking = [];

    for (const team of teams) {
        console.log(`\n🔍 ${team}`);
        out.teams[team] = {};

        for (const [player, entry] of Object.entries(cfg.teams[team])) {
            if (!entry || !entry.cSeq) {
                console.warn(`   ⚠️ ${player}：沒有 cSeq，請重新在後台綁定`);
                failed++;
                continue;
            }

            let info = null;
            try {
                info = await fetchProfile(entry.cSeq);
            } catch (err) {
                console.warn(`   ⚠️ ${player}：連線查詢失敗，改嘗試讀取本地索引（${err.message}）`);
            }
            await sleep(DELAY_MS);

            if (!info) info = {};

            // 有一部分會員的個人檔案完全不回傳資料（name 也是空字串，實測同一個
            // cSeq 連查三次都一樣，不是速率限制），推測是對方的隱私設定。
            // 這種情況 webrate 用索引補，但 PPD／MPR 索引裡沒有，只能標成無資料——
            // 寫 0 會在畫面上看起來像「這個人 PPD 是 0」。
            const profileHidden = !(info.name && String(info.name).trim());
            const idxPlayer = playerIndexMap.get(String(entry.cSeq));
            const cardName = (info.name && info.name.trim()) || (idxPlayer && idxPlayer.card) || entry.card;
            const webrate = (parseFloat(info.webrate) > 0 ? String(info.webrate) : null) || (idxPlayer && idxPlayer.webrate ? String(idxPlayer.webrate) : '0');
            const lv = levelOf(webrate) || (idxPlayer ? idxPlayer.level : null);
            const shopName = info.shopname || (idxPlayer ? idxPlayer.shop : '') || '';

            out.teams[team][player] = {
                card: cardName,
                cardAtBind: entry.card,
                cSeq: entry.cSeq,
                homeShop: shopName,
                webrate: webrate,
                level: lv,
                icon: lv ? `${RATING_ICON_DIR}/${lv}.webp` : null,
                ppd: profileHidden ? null : (info.ppd_tapd || null),
                mpr: profileHidden ? null : (info.mpr_tapd || null),
                profileHidden: profileHidden || undefined,
                source: profileHidden ? 'index' : 'myinfo',
            };
            ok++;

            // myinfo 是空的 → 排隊等第二輪用排行榜查即時的 rate
            if (profileHidden) {
                needRanking.push({ team, player, cSeq: String(entry.cSeq), shop: shopName });
            }

            let note = cardName.trim() !== String(entry.card).trim()
                ? `　（已改名，綁定時是「${entry.card}」）` : '';
            if (note) renamed++;
            if (profileHidden) { note += '　（個人檔案不公開，Rating 取自索引）'; hidden++; }
            const ppdTxt = profileHidden ? '-' : (info.ppd_tapd || '-');
            const mprTxt = profileHidden ? '-' : (info.mpr_tapd || '-');
            console.log(`   ✅ ${player.padEnd(6)} ${cardName.padEnd(20)} Lv${String(lv || '?').padStart(2)}  rate ${webrate}  PPD ${ppdTxt}  MPR ${mprTxt}${note}`);
        }
    }

    // ===== 第二輪：隱私帳號改查店家排行榜，取即時的 rate =====
    //
    // 為什麼值得多跑這一輪：第一輪那些人的 rate 是從離線索引來的，索引隔幾天
    // 就過時。排行榜是當下的值，而且對隱私帳號照樣公開。
    let fixedByRanking = 0;
    if (needRanking.length) {
        // 依店家分組，一家店一次撈完該店所有隱私帳號
        const byShop = new Map();
        for (const it of needRanking) {
            const sSeq = (shopMap[it.shop] || {}).sSeq;
            if (!sSeq) continue;                       // 不知道主店就沒得查，維持索引的值
            if (!byShop.has(sSeq)) byShop.set(sSeq, []);
            byShop.get(sSeq).push(it);
        }

        console.log(`\n🔎 ${needRanking.length} 人的個人檔案不公開，改查排行榜（${byShop.size} 家店）`);

        // 每一輪都拿「還沒找到的全部人」去比對，而不是只比對這家店的人。
        // 因為 s_seq 篩的是「在哪家店上機」，主店是另一回事——主店在 Jack Bar
        // 的人如果昨天去逃生打球，就只會出現在逃生的榜上。反正這幾家店都在永和，
        // 順手一起比對不多花請求。
        const remaining = new Map(needRanking.map(it => [it.cSeq, it]));
        for (const [sSeq] of byShop) {
            if (!remaining.size) break;
            let found;
            try {
                found = await fetchFromRanking(sSeq, new Set(remaining.keys()));
            } catch (err) {
                console.warn(`   ⚠️ 店家 ${sSeq} 排行榜查詢失敗：${err.message}`);
                continue;
            }
            for (const [cSeq, row] of found) {
                const it = remaining.get(cSeq);
                if (!it) continue;
                remaining.delete(cSeq);
                const rec = out.teams[it.team][it.player];
                const lv = levelOf(row.webrate) || (parseInt(row.class_num_30) || null);
                const changed = String(rec.webrate) !== String(row.webrate);
                rec.card = row.name.trim() || rec.card;
                rec.webrate = String(row.webrate);
                rec.level = lv;
                rec.icon = lv ? `${RATING_ICON_DIR}/${lv}.webp` : null;
                rec.source = 'ranking';
                fixedByRanking++;
                console.log(`   ✅ ${it.player.padEnd(6)} ${rec.card.padEnd(20)} Lv${String(lv || '?').padStart(2)}  rate ${row.webrate}${changed ? '　（索引裡是舊值）' : ''}`);
            }
        }

        for (const it of remaining.values()) {
            const rec = out.teams[it.team][it.player];
            console.warn(`   ⚠️ ${it.player}：排行榜也找不到（近期沒上機），維持索引的值 rate ${rec.webrate}`);
        }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
    console.log(`\n📄 已寫入 ${path.relative(process.cwd(), OUT_PATH)}`);
    console.log(`   成功 ${ok}　失敗 ${failed}${renamed ? `　改過名 ${renamed}` : ''}` +
        `${hidden ? `　檔案不公開 ${hidden}（其中 ${fixedByRanking} 人由排行榜補到即時 rate）` : ''}`);
}

main().catch(err => {
    console.error('❌ 執行失敗:', err.message);
    process.exit(1);
});
