/**
 * news 頁的分組相關行為（第七屆起兩組並行）
 *
 * 為什麼獨立成一個檔案而不是寫在 news.html 裡：index.html 是用 fetch + innerHTML
 * 把頁面注入 #contentArea，而 innerHTML **不會執行 <script>**。寫在 news.html
 * 的內嵌腳本在單獨開啟時能跑，但從網站正常瀏覽時完全不會執行——
 * 頁籤看得到卻點不動，因為那是寫死的 HTML、事件卻沒綁上。
 *
 * 這個檔案由 index.html 載入（不會隨頁面切換被替換），事件一律用委派，
 * 並監看 #contentArea 的變動，在內容換成 news 之後補上動態的部分。
 *
 * 包含三件事：
 *   1. 團隊總分排行：兩組切換
 *   2. 上週戰況／近期比賽：依組過濾
 *   3. 個人榜：標上所屬組別（不分組，只標註）
 */
(function () {
    'use strict';

    const ORDER = ['Team1', 'Team2'];
    const LABEL = { Team1: 'Team 1', Team2: 'Team 2' };
    const BADGE = { Team1: 'T1', Team2: 'T2' };
    const picked = {};   // 各賽況區塊目前選的組別

    function groups() {
        try {
            return (typeof SEASONS !== 'undefined' && SEASONS[7] && SEASONS[7].groups) || {};
        } catch (e) {
            return {};
        }
    }

    function groupOf(team) {
        const g = groups();
        for (const k in g) if (g[k].indexOf(team) >= 0) return k;
        return null;
    }

    // ===== 1. 團隊總分排行：兩組切換 =====
    // 兩張表都在頁面上，按鈕只決定顯示哪一張

    function switchStandings(tab) {
        const wrap = tab.closest('.ranking-section');
        if (!wrap) return;
        wrap.querySelectorAll('.league-tab').forEach(t => t.classList.toggle('active', t === tab));
        wrap.querySelectorAll('.ranking-table[data-league]').forEach(tb => {
            tb.hidden = tb.dataset.league !== tab.dataset.league;
        });
    }

    // ===== 2. 上週戰況／近期比賽：依組過濾 =====
    // 內容由 news.js 動態塞入，HTML 結構可能改版，所以比對文字裡有沒有該組隊名，
    // 不依賴特定選擇器

    function buildMatchTabs() {
        const g = groups();
        if (!Object.keys(g).length) return;
        document.querySelectorAll('.league-tabs[data-target]').forEach(host => {
            if (host.children.length) return;
            picked[host.dataset.target] = picked[host.dataset.target] || ORDER[0];
            host.innerHTML = ORDER.filter(k => g[k]).map(k =>
                `<button class="league-tab${k === picked[host.dataset.target] ? ' active' : ''}" data-league="${k}">${LABEL[k]}</button>`
            ).join('');
            filterMatches(host);
        });
    }

    function filterMatches(host) {
        const g = groups();
        const box = document.getElementById(host.dataset.target);
        if (!box || !Object.keys(g).length) return;
        const teams = g[picked[host.dataset.target] || ORDER[0]] || [];
        let shown = 0;
        Array.prototype.forEach.call(box.children, el => {
            if (el.classList.contains('loading-indicator')) return;
            const hit = teams.some(t => (el.textContent || '').indexOf(t) >= 0);
            el.hidden = !hit;
            if (hit) shown++;
        });
        // 該組當週沒比賽時給說明，不要留一片空白
        let note = box.querySelector('.league-empty');
        if (!note) {
            note = document.createElement('div');
            note.className = 'league-empty loading-indicator';
            box.appendChild(note);
        }
        note.hidden = shown > 0;
        note.textContent = '這一組本週沒有比賽';
    }

    // ===== 3. 個人榜：標上所屬組別 =====
    // 不分組——兩組每隊都打 10 場，出賽機會相同，合併排名本來就公平，
    // 分開只會讓每張榜少一半人。隊名對不上分組時不標，寧可沒有也不要標錯。

    function tagPersonal() {
        if (!Object.keys(groups()).length) return;
        document.querySelectorAll('.ranking-table:not([data-league])').forEach(table => {
            table.querySelectorAll('tr').forEach(tr => {
                const cell = tr.querySelector('td');
                if (!cell || cell.querySelector('.league-badge')) return;
                const g = groupOf(cell.textContent.trim());
                if (!g) return;
                const b = document.createElement('span');
                b.className = 'league-badge';
                b.textContent = BADGE[g] || g;
                cell.appendChild(b);
            });
        });
    }

    // ===== 綁定 =====

    document.addEventListener('click', e => {
        const tab = e.target.closest && e.target.closest('.league-tab');
        if (!tab) return;
        const host = tab.closest('.league-tabs[data-target]');
        if (host) {
            picked[host.dataset.target] = tab.dataset.league;
            host.querySelectorAll('.league-tab').forEach(t => t.classList.toggle('active', t === tab));
            filterMatches(host);
        } else {
            switchStandings(tab);
        }
    });

    function refresh() {
        buildMatchTabs();
        tagPersonal();
        document.querySelectorAll('.league-tabs[data-target]').forEach(filterMatches);
    }

    function start() {
        const area = document.getElementById('contentArea') || document.body;
        // 頁面內容是動態換掉的，而且 config.js 可能比這支晚載入，所以持續監看
        new MutationObserver(refresh).observe(area, { childList: true, subtree: true });
        refresh();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
