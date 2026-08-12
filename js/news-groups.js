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
 *   2. 上週戰況／近期比賽：在卡片上標出組別
 *   3. 個人榜：標上所屬組別（不分組，只標註）
 */
(function () {
    'use strict';

    const ORDER = ['掉鏢組', '靶外組'];
    // 個人榜的標籤要短，跟隊名擠在同一格
    const BADGE = { 掉鏢組: '掉鏢', 靶外組: '靶外' };

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

    // ===== 2. 上週戰況／近期比賽：在卡片上標出組別 =====
    // 不做頁籤過濾——一週只有 6 場，兩組並列看得完，切換反而多一道手續。
    // 靶外組的卡片底色深一階（見 styles/news.css），一眼就能分辨。
    // 隊名對不上分組時不標，寧可沒有也不要標錯。

    function tagMatchCards() {
        if (!Object.keys(groups()).length) return;
        document.querySelectorAll('.matches-content .match-item').forEach(card => {
            if (card.dataset.group) return;
            const names = card.querySelectorAll('.team-name');
            let g = null;
            for (const n of names) {
                g = groupOf(n.textContent.trim());
                if (g) break;
            }
            if (!g) return;
            card.dataset.group = g;
            const label = document.createElement('span');
            label.className = 'match-group';
            label.textContent = g;
            card.insertBefore(label, card.firstChild);
        });
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
        if (!e.target.closest) return;

        // 賽事動態頁籤切換 (近期比賽 / 上週戰況)
        const navTab = e.target.closest('.match-nav-tab');
        if (navTab) {
            const container = navTab.closest('.match-tab-container');
            if (container) {
                container.querySelectorAll('.match-nav-tab').forEach(t => t.classList.toggle('active', t === navTab));
                const targetId = navTab.dataset.target;
                container.querySelectorAll('.match-pane').forEach(pane => {
                    const isTarget = pane.id === targetId;
                    pane.hidden = !isTarget;
                    pane.classList.toggle('active', isTarget);
                });
            }
            return;
        }

        const tab = e.target.closest('.league-tab');
        if (tab) return switchStandings(tab);

        // 紅色標題列即開關
        const toggle = e.target.closest('.matches-toggle');
        if (toggle) {
            const box = document.getElementById(toggle.dataset.target);
            if (!box) return;
            const open = box.classList.toggle('collapsed');
            toggle.classList.toggle('expanded', !open);
        }
    });

    function refresh() {
        tagMatchCards();
        tagPersonal();
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
