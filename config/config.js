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
//   startDate — 開打日 YYYY/M/D。Sheets 只填 "M/D" 時用來推算年份，
//               null 代表該屆不補年份（試算表本身已有完整日期）
//   rankRange — 排行榜在 schedule 工作表的欄位範圍
//               舊制 K:Q（K 隊名、L 勝、M 敗、N 和、O 積分、P 飲酒加成、Q 總分）
//               新制 O:V（O 排名、P 隊名、Q 勝、R 敗、S 和、T 積分、U 飲酒加成、V 總分）

const DEFAULT_API_KEY = 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4';

const SEASONS = {
    3: {
        sheetId: '1Rjxr6rT_NfonXtYYsxpo3caYJbvI-fxc2WQh3tKBSC8',
        apiKey: DEFAULT_API_KEY,
        // 2024/11 開打、2025/2 結束，跨年；試算表已填完整日期，不需補年份
        label: '第三屆', startDate: null, rankRange: 'K:Q',
        schedulePage: 'schedule', rankPage: 'rank', resultDir: 'season3'
    },
    4: {
        sheetId: '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE',
        apiKey: DEFAULT_API_KEY,
        label: '第四屆', startDate: '2025/4/8', rankRange: 'K:Q',
        schedulePage: 'scheduleS4', rankPage: 'rankS4', resultDir: 'season4'
    },
    5: {
        // 這把 key 設有 referer 限制，只能從 yhdarts.com 網域呼叫
        sheetId: '1xb6UmcQ4ueQcCn_dHW8JJ9H2Ya2Mp94HdJqz90BlEEY',
        apiKey: 'AIzaSyDtba1arudetdcnc3yd3ri7Q35HlAndjr0',
        label: '第五屆', startDate: '2025/8/20', rankRange: 'O:V',
        schedulePage: 'scheduleS5', rankPage: 'rankS5', resultDir: 'season5'
    },
    6: {
        sheetId: '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM',
        apiKey: DEFAULT_API_KEY,
        label: '第六屆', startDate: '2026/1/27', endDate: '2026/6/2', rankRange: 'O:V',
        schedulePage: 'scheduleS6', rankPage: 'rankS6', resultDir: 'season6'
    },
    7: {
        sheetId: '1APUuzy6Dcbi1sWGUVvrbrluEvKsktRvPYygASofekKQ',
        apiKey: DEFAULT_API_KEY,
        // 2026/8/18 開打（週二賽制），10/27 結束
        label: '第七屆', startDate: '2026/8/18', endDate: '2026/10/27', rankRange: 'O:V',
        // 第七屆分組排行在試算表 schedule 分頁的對應參照範圍
        groupRankRanges: {
            掉鏢組: 'X2:Z7',
            靶外組: 'X9:Z14'
        },
        // 第七屆個人勝場排行與 Top Lady 在試算表 personal 分頁的參照範圍
        personalRankRanges: {
            勝場排行: 'personal!T2:V6',
            TopLady: 'personal!T9:V13'
        },
        schedulePage: 'scheduleS7', rankPage: 'rankS7', resultDir: 'season7',
        // 第七屆 12 隊拆兩組，2026/8/6 用 LINE 爬梯子公開抽出。
        // 隊名必須與 data/player.json 的 key 完全一致，名單比對才對得上。
        groups: {
            掉鏢組: ['酒空組', '軟飯揪團中', '人生揪難亮', '傑克紅心', 'Tonight29發財隊', '匪類里民一直喝'],
            靶外組: ['逃生Zoo口', '有點傻', '嘻嘻隊', '哈哈隊', '傑克黑桃', 'Tonight29恭喜隊']
        }
    }
};

// 當季屆數：news 頁的「上週戰況／近期比賽」抓這一屆，也決定 "M/D" 日期補哪一年。
//
// ⚠️ 新賽季的頁面可以先建好（scheduleS7 / rankS7 靠自己的 seasonOverride 運作，
//    不受這個值影響），但這個值要等到**新賽季試算表已填入賽程、且賽果資料夾有內容**
//    之後才能切換，否則首頁的戰況區塊會變空白、賽果連結會指向空資料夾。
//
// 第七屆 2026/8/18 開打，屆時再改成 7。
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

// 推算某個月份在該屆屬於哪一年。
// 賽季可能跨年（第三屆 2024/11→2025/2），
// 所以月份小於開打月份的一律算成下一年。
// startDate 為 null 時回傳 null，代表該屆不補年份。
function resolveSeasonYear(season, month) {
    if (!season || !season.startDate) return null;
    const [startYear, startMonth] = season.startDate.split('/').map(Number);
    if (!startYear || !startMonth || !month) return null;
    return month >= startMonth ? startYear : startYear + 1;
}

// 把 "M/D" 補成 "YYYY/M/D"；已含四位數年份或該屆不補年份時原樣回傳
function withSeasonYear(season, dateStr) {
    if (!dateStr || /^\d{4}\//.test(dateStr)) return dateStr;
    const month = parseInt(String(dateStr).split('/')[0], 10);
    const year = resolveSeasonYear(season, month);
    return year ? `${year}/${dateStr}` : dateStr;
}

// 取得某屆的設定；傳入 CONFIG 物件或屆數皆可
function getSeason(seasonOrConfig) {
    if (seasonOrConfig && typeof seasonOrConfig === 'object') {
        return SEASONS[seasonOrConfig.season] || null;
    }
    return SEASONS[seasonOrConfig] || null;
}

console.log(`CONFIG 已載入，共 ${Object.keys(SEASONS).length} 屆，當季為第 ${CURRENT_SEASON} 屆`);
