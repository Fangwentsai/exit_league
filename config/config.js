// ==================== 賽季註冊表 ====================
// 全站唯一的賽季設定來源。index.html 與各獨立頁面都會在 main.js / rank.js 之前載入本檔。
//
// 【新增一屆的做法】
//   1. 在 SEASONS 加一筆，並把 CURRENT_SEASON 改成新的屆數
//   2. 複製 pages/scheduleSN.html 與 pages/rankSN.html（只需改標題與 seasonOverride）
//   3. 建立 game_result/seasonN/ 資料夾
//   4. index.html 側邊欄兩個子選單各加一列
//
// 欄位說明
//   year      — Sheets 只填 "M/D" 時要補上的年份（null 代表該屆不補年份）
//   rankRange — 排行榜在 schedule 工作表的欄位範圍
//               舊制 K:Q（K 隊名、L 勝、M 敗、N 和、O 積分、P 飲酒加成、Q 總分）
//               新制 O:V（O 排名、P 隊名、Q 勝、R 敗、S 和、T 積分、U 飲酒加成、V 總分）

const DEFAULT_API_KEY = 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4';

const SEASONS = {
    3: {
        sheetId: '1Rjxr6rT_NfonXtYYsxpo3caYJbvI-fxc2WQh3tKBSC8',
        apiKey: DEFAULT_API_KEY,
        label: '第三屆', year: null, rankRange: 'K:Q',
        schedulePage: 'schedule', rankPage: 'rank', resultDir: 'season3'
    },
    4: {
        sheetId: '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE',
        apiKey: DEFAULT_API_KEY,
        label: '第四屆', year: 2025, rankRange: 'K:Q',
        schedulePage: 'scheduleS4', rankPage: 'rankS4', resultDir: 'season4'
    },
    5: {
        // 這把 key 設有 referer 限制，只能從 yhdarts.com 網域呼叫
        sheetId: '1xb6UmcQ4ueQcCn_dHW8JJ9H2Ya2Mp94HdJqz90BlEEY',
        apiKey: 'AIzaSyDtba1arudetdcnc3yd3ri7Q35HlAndjr0',
        label: '第五屆', year: 2025, rankRange: 'O:V',
        schedulePage: 'scheduleS5', rankPage: 'rankS5', resultDir: 'season5'
    },
    6: {
        sheetId: '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM',
        apiKey: DEFAULT_API_KEY,
        label: '第六屆', year: 2026, rankRange: 'O:V',
        schedulePage: 'scheduleS6', rankPage: 'rankS6', resultDir: 'season6'
    },
    7: {
        sheetId: '1APUuzy6Dcbi1sWGUVvrbrluEvKsktRvPYygASofekKQ',
        apiKey: DEFAULT_API_KEY,
        label: '第七屆', year: 2027, rankRange: 'O:V',
        schedulePage: 'scheduleS7', rankPage: 'rankS7', resultDir: 'season7'
    }
};

// 當季屆數：news 頁的賽程與戰報預設抓這一屆
const CURRENT_SEASON = 7;

// 頁面名稱 → 屆數（例如 scheduleS6 → 6、rank → 3）
const PAGE_TO_SEASON = {};
Object.keys(SEASONS).forEach(num => {
    PAGE_TO_SEASON[SEASONS[num].schedulePage] = Number(num);
    PAGE_TO_SEASON[SEASONS[num].rankPage] = Number(num);
});

// 由註冊表推導出舊格式的 CONFIG，維持既有呼叫端不變
const CONFIG = {};
Object.keys(SEASONS).forEach(num => {
    CONFIG[`SEASON${num}`] = {
        SHEET_ID: SEASONS[num].sheetId,
        API_KEY: SEASONS[num].apiKey,
        SEASON_FILTER: String(num),
        season: Number(num)
    };
});

// 從 seasonOverride、頁面名稱或網址解析出屆數，找不到時回傳 null
// 優先順序：override → 頁面名稱 → 網址路徑
function resolveSeasonNumber({ page, override, path } = {}) {
    if (override !== undefined && override !== null && override !== '') {
        const digits = String(override).match(/\d+/);
        if (digits && SEASONS[digits[0]]) return Number(digits[0]);
    }

    if (page && PAGE_TO_SEASON[page]) return PAGE_TO_SEASON[page];

    if (path) {
        // 比對長頁名優先（scheduleS6 要先於 schedule），避免被前綴誤判
        const pages = Object.keys(PAGE_TO_SEASON).sort((a, b) => b.length - a.length);
        const hit = pages.find(name => path.includes(name));
        if (hit) return PAGE_TO_SEASON[hit];
    }

    return null;
}

// 取得某屆的設定；傳入 CONFIG 物件或屆數皆可
function getSeason(seasonOrConfig) {
    if (seasonOrConfig && typeof seasonOrConfig === 'object') {
        return SEASONS[seasonOrConfig.season] || null;
    }
    return SEASONS[seasonOrConfig] || null;
}

console.log(`CONFIG 已載入，共 ${Object.keys(SEASONS).length} 屆，當季為第 ${CURRENT_SEASON} 屆`);
