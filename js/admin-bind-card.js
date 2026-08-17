/**
 * 綁定卡片 — 把聯賽選手對應到 PhoenixDarts 的卡片
 *
 * 對照結果寫進 data/phoenix_cards.json，Preview 頁靠它顯示等級圖示
 * （見 js/match-preview.js）。抓 Rating 的是 scripts/phoenix_fetch.js。
 *
 * 【為什麼搜尋是查本機索引，不是即時打 PhoenixDarts】
 * 他們沒有「用名字搜尋選手」的端點，只能一頁一頁列排行榜再自己過濾——
 * 每打一個字翻幾百頁不可行，何況瀏覽器直接跨網域打也會被 CORS 擋。
 * 所以改成 scripts/phoenix_index.js 離線先把全國名單抓成 data/phoenix_players.json
 * （約 3600 人、528KB），這裡在記憶體裡搜，零延遲也不會一直騷擾對方的老主機。
 * 代價是索引有時效：只收錄近期有上機的人，找不到人就重跑那支腳本。
 *
 * 【為什麼綁定後不可修改】
 * 卡片名稱會被本人改掉，所以真正的識別碼是 c_seq。綁錯了要改，等於要把
 * 已經抓下來的 Rating 一起清掉，流程複雜且容易出錯；與其事後補救，
 * 不如在送出前用確認視窗擋一次。真的綁錯就直接改 data/phoenix_cards.json。
 */

let _bindCards = null;      // data/phoenix_cards.json
let _bindIndex = null;      // data/phoenix_players.json 的 players
let _bindShops = null;      // data/phoenix_shops.json 的 shops
let _bindTeams = null;      // data/player.json
let _bindBusy = false;

const BIND_CARDS_PATH = 'data/phoenix_cards.json';

async function initBindCard() {
    const sel = document.getElementById('bindTeamSelect');
    if (!sel) return;

    if (!_bindIndex) {
        sel.innerHTML = '<option value="">載入索引中…</option>';
        try {
            const bust = '?_=' + Date.now();
            const [teams, cards, index, shops] = await Promise.all([
                fetch('../data/player.json' + bust).then(r => r.json()),
                fetch('../' + BIND_CARDS_PATH + bust).then(r => r.ok ? r.json() : { teams: {}, shops: {} }),
                fetch('../data/phoenix_players.json' + bust).then(r => r.json()),
                fetch('../data/phoenix_shops.json' + bust).then(r => r.ok ? r.json() : { shops: {} }),
            ]);
            _bindTeams = teams;
            _bindCards = cards && cards.teams ? cards : { note: '', shops: {}, teams: {} };
            _bindIndex = index.players || [];
            _bindShops = shops.shops || {};
        } catch (err) {
            sel.innerHTML = '<option value="">載入失敗</option>';
            alert('載入卡片索引失敗：' + err.message);
            return;
        }

        sel.innerHTML = '<option value="">請選擇隊伍...</option>' +
            Object.keys(_bindTeams).map(t => `<option value="${t}">${t}（${_bindTeams[t].length} 人）</option>`).join('');
        sel.onchange = () => renderBindList(sel.value);
    }

    if (sel.value) renderBindList(sel.value);
}

// ===== 名單 =====

function renderBindList(team) {
    const panel = document.getElementById('bindListPanel');
    const list = document.getElementById('bindList');
    const count = document.getElementById('bindCount');
    if (!team) { panel.style.display = 'none'; return; }

    const roster = _bindTeams[team] || [];
    const bound = (_bindCards.teams && _bindCards.teams[team]) || {};
    const doneCount = roster.filter(n => bound[n] && bound[n].cSeq).length;

    panel.style.display = 'block';
    count.textContent = `${doneCount} / ${roster.length}`;

    list.innerHTML = roster.map(name => {
        const e = bound[name];
        if (e && e.cSeq) {
            // 已綁定：灰底、不可點
            return `<div class="bind-row bind-row-done" title="綁定後不可修改">
                        <span class="bind-name">${name}</span>
                        <span class="bind-card">${e.card}</span>
                        <span class="bind-lock">已綁定</span>
                    </div>`;
        }
        return `<div class="bind-row" data-player="${name}">
                    <span class="bind-name">${name}</span>
                    <div class="bind-search">
                        <input type="text" class="bind-input" placeholder="輸入卡片名稱關鍵字…"
                               autocomplete="off" oninput="onBindSearch(this, '${team}', '${name}')">
                        <div class="bind-results"></div>
                    </div>
                </div>`;
    }).join('');
}

// ===== 搜尋 =====

/** 已經被任何隊員綁走的 cSeq。一張卡只能對應一個人。
    用 cSeq 而不是卡片名稱來判斷：對方改名之後名稱會對不上，
    改名的人就會變成「還沒綁」而被重複綁一次。 */
function boundCSeqs() {
    const used = new Set();
    for (const team of Object.keys(_bindCards.teams || {})) {
        for (const e of Object.values(_bindCards.teams[team])) {
            if (e && e.cSeq) used.add(String(e.cSeq));
        }
    }
    return used;
}

/**
 * 排序：中永和 > 其他新北 > 台北 > 其他（areaRank 已在索引裡算好），
 * 同一區再看「是不是從開頭就吻合」與等級高低。
 * 自家聯賽在永和，隊員的卡片幾乎都出自中永和的店，排前面才不用捲。
 */
function searchCards(keyword) {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];
    // 綁過的卡不再出現在結果裡——否則同一張卡會被綁給兩個人，
    // 兩人的等級與 PPD 都會變成同一份資料
    const used = boundCSeqs();
    const hit = [];
    for (const p of _bindIndex) {
        if (used.has(String(p.cSeq))) continue;
        const idx = p.card.toLowerCase().indexOf(q);
        if (idx >= 0) hit.push({ p, head: idx === 0 ? 0 : 1 });
    }
    hit.sort((a, b) =>
        a.p.areaRank - b.p.areaRank ||
        a.head - b.head ||
        (b.p.level || 0) - (a.p.level || 0)
    );
    return hit.slice(0, 12).map(h => h.p);
}

function onBindSearch(input, team, player) {
    const box = input.parentElement.querySelector('.bind-results');
    const results = searchCards(input.value);

    if (!input.value.trim()) { box.innerHTML = ''; return; }
    if (!results.length) {
        box.innerHTML = '<div class="bind-empty">找不到相符的卡片。索引只收錄近期有上機的人，可請對方先去店裡打一場，或重跑 scripts/phoenix_index.js。</div>';
        return;
    }

    box.innerHTML = results.map(p => {
        const shop = _bindShops[p.shop] || {};
        // 只取到行政區，不要街道——一行放不下，截斷後看起來像壞掉的地址
        const m = (shop.address || '').match(/^(.{2,3}[市縣])(.{1,3}[區鄉鎮市])/);
        const area = m ? m[1] + m[2] : '';
        return `<div class="bind-opt" onclick="confirmBind('${team}', '${player}', '${p.cSeq}')">
                    <span class="bind-opt-lv">Lv${p.level || '?'}</span>
                    <span class="bind-opt-name">${p.card}</span>
                    <span class="bind-opt-meta">${p.webrate}　${p.shop || ''}${area ? '（' + area + '）' : ''}</span>
                </div>`;
    }).join('');
}

// ===== 寫入 =====

async function confirmBind(team, player, cSeq) {
    if (_bindBusy) return;
    const p = _bindIndex.find(x => x.cSeq === cSeq);
    if (!p) return;

    // 搜尋結果已經濾掉綁過的卡，但清單可能是點擊前渲染的，送出前再擋一次
    if (boundCSeqs().has(String(p.cSeq))) {
        alert(`「${p.card}」已經綁給其他隊員了，一張卡只能綁一個人。`);
        return;
    }

    const shop = _bindShops[p.shop] || {};
    const ok = confirm(
        `請確認名稱，綁定後不可修改\n\n` +
        `聯賽隊員：${team} / ${player}\n` +
        `卡片名稱：${p.card}\n` +
        `等　　級：Lv${p.level || '?'}（rating ${p.webrate}）\n` +
        `主　　店：${p.shop || '—'}${shop.address ? '\n地　　址：' + shop.address : ''}`
    );
    if (!ok) return;

    _bindBusy = true;
    try {
        if (!_bindCards.teams) _bindCards.teams = {};
        if (!_bindCards.teams[team]) _bindCards.teams[team] = {};
        // cSeq 才是之後更新 Rating 的依據；card 只是綁定當下的名稱，留著給人看
        _bindCards.teams[team][player] = {
            card: p.card,
            cSeq: p.cSeq,
            boundAt: new Date().toISOString().slice(0, 10),
        };

        const content = JSON.stringify(_bindCards, null, 2) + '\n';

        // 走跟「新增隊員」相同的路徑：GAS 代寫回 GitHub。
        // no-cors 收不到回應，所以下面的成功提示是樂觀更新——與新增隊員一致。
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbwJ3xPlfON7pkmeVKzpQImQhnlzpMz6Fn4Z1E7PwXVBZBvlncA7VCQ3tITyq9x8puAu/exec';
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'uploadToGitHub',
                filePath: BIND_CARDS_PATH,
                content,
                commitMessage: `🎴 綁定卡片 ${team} ${player} → ${p.card}`,
            }),
        });

        alert(`✅ 已綁定\n${player} → ${p.card}`);
        renderBindList(team);
    } catch (err) {
        alert('綁定失敗：' + err.message);
    } finally {
        _bindBusy = false;
    }
}
