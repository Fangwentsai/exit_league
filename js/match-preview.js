// match-preview.js — 比賽名單預覽模組
// 點擊未打比賽 → 彈出兩隊名單 + 個人本季戰績（表格呈現）

(function () {
    'use strict';

    // ========== 快取 ==========
    let _personalStatsCache = null;
    let _playerJsonCache = null;
    let _fetchingStats = false;

    // ========== Config ==========
    const PERSONAL_RANGE = 'personal!A:N';

    function seasonSheet() {
        try {
            const seasonNum = (typeof resolveSeasonNumber === 'function')
                ? resolveSeasonNumber({})
                : (typeof CURRENT_SEASON !== 'undefined' ? CURRENT_SEASON : 7);
            const s = (typeof SEASONS !== 'undefined' && SEASONS[seasonNum]) ? SEASONS[seasonNum] : null;
            if (s && s.sheetId) return { id: s.sheetId, key: s.apiKey || 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4', label: s.label || '第七屆' };
        } catch (e) { /* fallback */ }
        return {
            id: '1APUuzy6Dcbi1sWGUVvrbrluEvKsktRvPYygASofekKQ',
            key: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
            label: '第七屆'
        };
    }

    // ========== 建立 Modal DOM ==========
    function ensureModalDom() {
        if (document.getElementById('matchPreviewOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'matchPreviewOverlay';
        overlay.className = 'match-preview-overlay';
        overlay.innerHTML = `<div class="match-preview-card" id="matchPreviewCard"></div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeMatchPreview();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMatchPreview();
        });
    }

    // ========== 載入 CSS ==========
    function ensureCss() {
        if (document.getElementById('match-preview-css')) return;
        const link = document.createElement('link');
        link.id = 'match-preview-css';
        link.rel = 'stylesheet';
        const isInPages = window.location.pathname.includes('/pages/');
        link.href = isInPages ? '../styles/match-preview.css' : 'styles/match-preview.css';
        document.head.appendChild(link);
    }

    // ========== 撈取 player.json ==========
    async function fetchPlayerJson() {
        if (_playerJsonCache) return _playerJsonCache;
        const isInPages = window.location.pathname.includes('/pages/');
        const basePath = isInPages ? '../data/player.json' : 'data/player.json';
        try {
            const resp = await fetch(basePath);
            _playerJsonCache = await resp.json();
            return _playerJsonCache;
        } catch (err) {
            console.error('❌ 讀取 player.json 失敗:', err);
            return {};
        }
    }

    // ========== 撈取 Google Sheets personal 工作表 ==========
    async function fetchPersonalStats() {
        if (_personalStatsCache) return _personalStatsCache;
        if (_fetchingStats) {
            while (_fetchingStats) await new Promise(r => setTimeout(r, 100));
            return _personalStatsCache;
        }
        _fetchingStats = true;
        try {
            const sheet = seasonSheet();
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.id}/values/${PERSONAL_RANGE}?key=${sheet.key}`;
            console.log('📊 正在撈取 personal 工作表...');
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`API 錯誤: ${resp.status}`);
            const json = await resp.json();
            const rows = json.values || [];
            if (rows.length < 2) throw new Error('personal 工作表無資料');

            const cache = {};
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length < 2) continue;
                const team = (row[0] || '').trim();
                const name = (row[1] || '').trim();
                if (!team || !name) continue;
                const key = `${team}_${name}`.toLowerCase();
                cache[key] = {
                    team, name,
                    wins01: row[2] || '0',
                    winRate01: row[3] || '0%',
                    winsCR: row[4] || '0',
                    winRateCR: row[5] || '0%',
                    totalWins: row[6] || '0',
                    totalWinRate: row[7] || '0%',
                    firstAttackRate: row[8] || 'DNP',
                    games01: row[9] || '0',
                    gamesCR: row[10] || '0',
                    firstAttacks: row[11] || '0',
                    totalGames: row[12] || '0',
                    gender: row[13] || ''
                };
            }
            _personalStatsCache = cache;
            console.log(`✅ personal 資料已載入，共 ${Object.keys(cache).length} 筆`);
            return cache;
        } catch (err) {
            console.error('❌ 撈取 personal 失敗:', err);
            return {};
        } finally {
            _fetchingStats = false;
        }
    }

    // ========== 生成隊伍表格 ==========
    function renderTeamTable(teamName, playerList, statsMap, cssClass) {
        // 按總勝場數降序排列
        const sorted = [...playerList].sort((a, b) => {
            const sa = statsMap[`${teamName}_${a}`.toLowerCase()];
            const sb = statsMap[`${teamName}_${b}`.toLowerCase()];
            const wa = sa ? parseInt(sa.totalWins) || 0 : 0;
            const wb = sb ? parseInt(sb.totalWins) || 0 : 0;
            const ga = sa ? parseInt(sa.totalGames) || 0 : 0;
            const gb = sb ? parseInt(sb.totalGames) || 0 : 0;
            if (ga > 0 && gb === 0) return -1;
            if (gb > 0 && ga === 0) return 1;
            return wb - wa;
        });

        let rows = '';
        for (const name of sorted) {
            const s = statsMap[`${teamName}_${name}`.toLowerCase()];
            if (s && parseInt(s.totalGames) > 0) {
                const rate = parseFloat((s.totalWinRate || '0').replace('%', ''));
                const rateColor = rate >= 60 ? '#28a745' : rate >= 40 ? '#333' : '#999';
                rows += `<tr>
                    <td class="mp-td-name">${s.name}</td>
                    <td>${s.totalWins}/${s.totalGames}</td>
                    <td style="color:${rateColor};font-weight:600">${s.totalWinRate}</td>
                    <td>${s.winRate01}</td>
                    <td>${s.winRateCR}</td>
                </tr>`;
            } else {
                rows += `<tr class="mp-tr-inactive">
                    <td class="mp-td-name">${name}</td>
                    <td>-</td><td>-</td><td>-</td><td>-</td>
                </tr>`;
            }
        }

        return `<div class="mp-team-section">
            <div class="mp-col-header ${cssClass}">${teamName}</div>
            <div class="mp-table-wrap">
                <table class="mp-table">
                    <thead><tr>
                        <th>姓名</th><th>勝/場</th><th>勝率</th><th>01%</th><th>CR%</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    }

    // ========== 主要函數：開啟預覽 ==========
    window.openMatchPreview = async function (team1, team2) {
        console.log(`🔍 開啟比賽預覽: ${team1} vs ${team2}`);
        ensureCss();
        ensureModalDom();

        const card = document.getElementById('matchPreviewCard');
        const overlay = document.getElementById('matchPreviewOverlay');

        // 載入中狀態
        card.innerHTML = `
            <div class="mp-header">
                <button class="mp-close" onclick="closeMatchPreview()">✕</button>
                <div class="mp-vs-row">
                    <span class="mp-team-title team1">${team1}</span>
                    <div class="mp-vs-center"><span class="mp-preview-label">PREVIEW</span><span class="mp-vs-badge">VS</span></div>
                    <span class="mp-team-title team2">${team2}</span>
                </div>
                <div class="mp-loading-hint">正在載入個人戰績...</div>
            </div>
            <div class="mp-body">
                <div class="mp-body-loading">
                    <div class="mp-spinner"></div>
                    <span>撈取資料中...</span>
                </div>
            </div>`;

        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';

        const [players, statsMap] = await Promise.all([
            fetchPlayerJson(),
            fetchPersonalStats()
        ]);

        const team1Players = players[team1] || [];
        const team2Players = players[team2] || [];
        const sheet = seasonSheet();

        card.innerHTML = `
            <div class="mp-header">
                <button class="mp-close" onclick="closeMatchPreview()">✕</button>
                <div class="mp-vs-row">
                    <span class="mp-team-title team1">${team1}</span>
                    <div class="mp-vs-center"><span class="mp-preview-label">PREVIEW</span><span class="mp-vs-badge">VS</span></div>
                    <span class="mp-team-title team2">${team2}</span>
                </div>
            </div>
            <div class="mp-body">
                ${renderTeamTable(team1, team1Players, statsMap, 'away')}
                ${renderTeamTable(team2, team2Players, statsMap, 'home')}
            </div>
            <div class="mp-footer">
                📊 個人戰績來自${sheet.label} Google Sheets，即時更新
            </div>`;
    };

    // ========== 關閉預覽 ==========
    window.closeMatchPreview = function () {
        const overlay = document.getElementById('matchPreviewOverlay');
        if (overlay) overlay.classList.remove('visible');
        document.body.style.overflow = '';
    };

})();
