/**
 * Vercel API Route: Google Sheets 唯讀代理
 *
 * 前端原本直接打 sheets.googleapis.com，API key 跟著 config/config.js 一起送進
 * 瀏覽器，只能靠 Google Cloud 的 HTTP referrer 限制擋盜用。但這個 repo 是公開的，
 * referrer 也能偽造，而且該限制會把 vercel.app 的 preview 部署一併擋掉（403
 * PERMISSION_DENIED: Requests from referer ... are blocked）。
 *
 * 改成由這支在伺服器端帶 key，前端只看得到 /api/sheets，好處是：
 *   - key 不再進瀏覽器，也不用再設 referrer 限制，preview / localhost 都能跑
 *   - 回應走 CDN 快取，少打 Google 幾次
 *
 * GET /api/sheets?id=<spreadsheetId>&range=<A1 範圍>   讀取儲存格
 * GET /api/sheets?id=<spreadsheetId>&meta=1            讀取試算表基本資料
 * 額外參數 &fresh=1 會略過 CDN 快取（後台寫入後要立刻看到新值時用）
 *
 * 環境變數：
 *   GOOGLE_SHEETS_API_KEY  （必填）伺服器端的 Sheets API key
 *   SHEETS_ALLOWED_IDS     （選填）逗號分隔的試算表白名單，覆寫下面的預設值
 */

// 只服務自己的試算表，免得變成任何人都能用的開放代理。
// 這幾個 ID 本來就在公開 repo 裡，不是機密；新增一屆時記得跟 config/config.js 同步。
const DEFAULT_ALLOWED_IDS = [
    '1APUuzy6Dcbi1sWGUVvrbrluEvKsktRvPYygASofekKQ',
    '1Rjxr6rT_NfonXtYYsxpo3caYJbvI-fxc2WQh3tKBSC8',
    '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE',
    '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM',
    '1xb6UmcQ4ueQcCn_dHW8JJ9H2Ya2Mp94HdJqz90BlEEY'
];

// A1 表示法：可選的工作表名稱（允許中日文）+ 欄列範圍。擋掉奇怪的輸入。
const RANGE_PATTERN = /^(?:[A-Za-z0-9_\u4e00-\u9fff ]{1,40}!)?[A-Z]{1,3}\d{0,5}(?::[A-Z]{1,3}\d{0,5})?$/;

function allowedIds() {
    const fromEnv = (process.env.SHEETS_ALLOWED_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    return fromEnv.length ? fromEnv : DEFAULT_ALLOWED_IDS;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: '只接受 GET' });
    }

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
        // 講清楚是設定漏了，不要讓前端看到一個沒頭沒尾的 500
        return res.status(500).json({ error: '伺服器未設定 GOOGLE_SHEETS_API_KEY' });
    }

    const { id, range, meta, fresh } = req.query || {};

    if (!id || !allowedIds().includes(id)) {
        return res.status(403).json({ error: '不在允許的試算表清單內' });
    }

    const wantsMeta = meta === '1' || meta === 'true';
    if (!wantsMeta) {
        if (!range || range.length > 100 || !RANGE_PATTERN.test(range)) {
            return res.status(400).json({ error: 'range 格式不正確' });
        }
    }

    const target = wantsMeta
        ? `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?key=${apiKey}`
        : `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    try {
        const upstream = await fetch(target);
        const body = await upstream.json();

        if (!upstream.ok) {
            // 只把 Google 的狀態與訊息帶回去，絕不回傳 target（裡面有 key）
            const message = (body && body.error && body.error.message) || 'Google Sheets 讀取失敗';
            return res.status(upstream.status).json({ error: message });
        }

        // 排行榜與賽程一週才變一次，短快取就夠；fresh=1 讓後台寫入後能立刻看到
        res.setHeader(
            'Cache-Control',
            fresh === '1' ? 'no-store' : 'max-age=0, s-maxage=60, stale-while-revalidate=300'
        );
        return res.status(200).json(body);
    } catch (err) {
        console.error('[api/sheets] 讀取失敗:', err && err.message);
        return res.status(502).json({ error: '無法連線到 Google Sheets' });
    }
};
