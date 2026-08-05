/**
 * Vercel API Route: 分紙照片辨識
 *
 * 收到一張分紙照片 + 該場兩隊名單，呼叫 Gemini 辨識 16 局的選手／先攻／勝負，
 * 每個欄位都附信心分數，交給前端依信心分級處理（見 SCORESHEET_OCR.md）。
 *
 * 設計要點（詳見 SCORESHEET_OCR.md 的實測發現）：
 *   - 不讀照片上的隊名/日期，兩隊由呼叫端傳入（來自使用者選擇的 gamecode）
 *   - 人名比對限定在該場兩隊的名單內，不開放自由辨識
 *   - 塗黑框可能是螺旋塗鴉而非塗滿，任何可見墨跡都算「已勾選」
 *   - 用 SET_POINTS 加總必為 30 分的特性做逐局勝負的客觀驗算，
 *     不依賴模型自報的總分（自報總分符合不代表每局都對）
 *   - 目前帳號的免費額度只開通 gemini-2.5-flash（已實測確認，
 *     2.5-pro / 2.0-flash 回傳 429 額度 0），故寫死使用該模型
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_HOST = 'https://generativelanguage.googleapis.com';

// 16 局的類型與每局分數，對應 pages/scoresheet.html 的 SETS 定義
const SET_DEFS = [
    { set: 1, players: 1, points: 1 },
    { set: 2, players: 1, points: 1 },
    { set: 3, players: 1, points: 1 },
    { set: 4, players: 1, points: 1 },
    { set: 5, players: 3, points: 3 },
    { set: 6, players: 1, points: 1 },
    { set: 7, players: 1, points: 1 },
    { set: 8, players: 1, points: 1 },
    { set: 9, players: 1, points: 1 },
    { set: 10, players: 3, points: 3 },
    { set: 11, players: 2, points: 2 },
    { set: 12, players: 2, points: 2 },
    { set: 13, players: 2, points: 2 },
    { set: 14, players: 2, points: 2 },
    { set: 15, players: 4, points: 4 },
    { set: 16, players: 4, points: 4 },
];

// 出賽限制：同組內同一人只能出賽一次（與 js/admin-main.js 的 noRepeatGroups 一致）
const NO_REPEAT_GROUPS = [[1, 4], [6, 9], [11, 12], [13, 14]];

const SET_POINTS_SUM = SET_DEFS.reduce((s, d) => s + d.points, 0); // = 30

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '伺服器未設定 GEMINI_API_KEY' });
    }

    try {
        const { image, mimeType, gameCode, homeTeam, awayTeam, homeRoster, awayRoster } = req.body || {};

        const missing = [];
        if (!image) missing.push('image');
        if (!homeTeam) missing.push('homeTeam');
        if (!awayTeam) missing.push('awayTeam');
        if (!Array.isArray(homeRoster) || homeRoster.length === 0) missing.push('homeRoster');
        if (!Array.isArray(awayRoster) || awayRoster.length === 0) missing.push('awayRoster');
        if (missing.length) {
            return res.status(400).json({ error: `缺少必要欄位：${missing.join(', ')}` });
        }

        const { data: imageData, mimeType: resolvedMimeType } = parseImage(image, mimeType);

        const geminiResult = await callGemini({
            apiKey,
            imageData,
            mimeType: resolvedMimeType,
            gameCode,
            homeTeam,
            awayTeam,
            homeRoster,
            awayRoster,
        });

        const withRosterMatch = applyRosterMatching(geminiResult, homeRoster, awayRoster);
        const withCrossCheck = applyCrossCheck(withRosterMatch);

        return res.status(200).json(withCrossCheck);
    } catch (err) {
        console.error('❌ analyze-scoresheet 失敗:', err);
        // 不要把內部錯誤細節（可能含請求內容）原樣丟給前端
        const message = err.userMessage || 'Gemini 辨識失敗，請稍後再試或直接手動填寫';
        return res.status(err.statusCode || 500).json({ error: message });
    }
};

/**
 * 接受 data URL（"data:image/jpeg;base64,xxx"）或純 base64 字串。
 */
function parseImage(image, fallbackMimeType) {
    const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(image);
    if (match) {
        return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: fallbackMimeType || 'image/jpeg', data: image };
}

async function callGemini({ apiKey, imageData, mimeType, gameCode, homeTeam, awayTeam, homeRoster, awayRoster }) {
    const prompt = buildPrompt({ gameCode, homeTeam, awayTeam, homeRoster, awayRoster });
    const schema = buildResponseSchema();

    const url = `${GEMINI_API_HOST}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType, data: imageData } },
            ],
        }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.1, // 辨識任務要穩定輸出，不要有創意
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const json = await response.json();

    if (!response.ok) {
        const err = new Error(json?.error?.message || `Gemini API 錯誤 (HTTP ${response.status})`);
        err.statusCode = response.status === 429 ? 429 : 502;
        err.userMessage = response.status === 429
            ? 'Gemini API 額度已用完，請稍後再試'
            : 'Gemini 辨識服務暫時無法使用';
        throw err;
    }

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        const err = new Error('Gemini 回應中沒有可用內容');
        err.userMessage = '辨識結果為空，請確認照片清晰且四角定位點完整入鏡';
        throw err;
    }

    try {
        return JSON.parse(text);
    } catch (parseErr) {
        console.error('無法解析 Gemini 回應為 JSON:', text);
        const err = new Error('Gemini 回應格式錯誤');
        err.userMessage = '辨識結果格式異常，請直接手動填寫';
        throw err;
    }
}

function buildPrompt({ gameCode, homeTeam, awayTeam, homeRoster, awayRoster }) {
    const setList = SET_DEFS.map(d =>
        `SET${d.set}：${d.players === 1 ? '單人' : d.players === 2 ? '雙人' : d.players === 3 ? '三人' : '四人'}局`
    ).join('\n');

    return `你是一個飛鏢比賽分紙的辨識助手。這張分紙的版面結構固定如下：

- 頁首：場次、日期、主隊「${homeTeam}」、客隊「${awayTeam}」
- 主表格 16 列（SET1~SET16），每列從左到右依序是：
  1. 主隊選手（一或多個手寫姓名，依局別人數而定）
  2. 「主先攻」塗黑方框
  3. 「主勝」塗黑方框
  4. SET 編號與局別說明
  5. 「客勝」塗黑方框
  6. 「客先攻」塗黑方框
  7. 客隊選手（一或多個手寫姓名）

各局人數：
${setList}

重要規則：
1. **主隊選手只能是以下名單中的人，不要辨識成名單外的名字**：
   ${homeRoster.join('、')}
2. **客隊選手只能是以下名單中的人**：
   ${awayRoster.join('、')}
3. 塗黑方框的填法可能是「螺旋塗鴉」而不是整格塗滿，只要框內有明顯筆跡（無論形狀）都算「已勾選」。
4. 「主先攻」與「主勝」是兩個獨立的框，可能同時被塗黑（代表同一隊既先攻又獲勝），這是正常情況，不是重複勾選的錯誤。
5. 若某個欄位字跡潦草、模糊到你沒有把握，請誠實給出低信心分數（甚至 0），**不要用猜測填一個看起來合理但沒有根據的答案**。姓名讀不出來就回傳 null，先攻/勝負讀不出來就回傳 "unclear"。
6. 場次代號（gamecode）如果照片上有寫，讀出來放進 gameCode 欄位；這場的實際場次是「${gameCode || '未提供'}」，僅供你交叉核對，不代表照片上一定寫得一致。

請針對每個欄位輸出 0~100 的信心分數（100 表示非常確定）。`;
}

function buildResponseSchema() {
    const playerField = {
        type: 'OBJECT',
        properties: {
            name: { type: 'STRING', nullable: true },
            confidence: { type: 'INTEGER' },
        },
        required: ['name', 'confidence'],
    };

    const choiceField = (enumValues) => ({
        type: 'OBJECT',
        properties: {
            value: { type: 'STRING', enum: enumValues },
            confidence: { type: 'INTEGER' },
        },
        required: ['value', 'confidence'],
    });

    return {
        type: 'OBJECT',
        properties: {
            gameCodeOnPhoto: { type: 'STRING', nullable: true },
            sets: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        set: { type: 'INTEGER' },
                        homePlayers: { type: 'ARRAY', items: playerField },
                        awayPlayers: { type: 'ARRAY', items: playerField },
                        firstAttack: choiceField(['home', 'away', 'unclear']),
                        winner: choiceField(['home', 'away', 'unclear']),
                    },
                    required: ['set', 'homePlayers', 'awayPlayers', 'firstAttack', 'winner'],
                },
            },
            drinkingBonus: choiceField(['home', 'away', 'none', 'unclear']),
        },
        required: ['sets', 'drinkingBonus'],
    };
}

// ===== 後處理 1：名單模糊比對 =====
// 模型有時仍會回傳名單外的名字（尤其是低信心的情況），這裡再比對一次，
// 不完全信任模型自己「保證只選名單內」的承諾。

function applyRosterMatching(result, homeRoster, awayRoster) {
    const sets = (result.sets || []).map(s => ({
        ...s,
        homePlayers: (s.homePlayers || []).map(p => matchAgainstRoster(p, homeRoster)),
        awayPlayers: (s.awayPlayers || []).map(p => matchAgainstRoster(p, awayRoster)),
    }));
    return { ...result, sets };
}

function matchAgainstRoster(player, roster) {
    if (!player || !player.name) {
        return { name: null, confidence: 0 };
    }
    if (roster.includes(player.name)) {
        return player; // 完全對上，信心分數維持模型給的值
    }
    const best = closestMatch(player.name, roster);
    if (best && best.distance <= 1) {
        // 差一個字以內，很可能是同一人，但信心要打折
        return { name: best.name, confidence: Math.max(0, Math.min(player.confidence, 100) - 20) };
    }
    // 名單裡完全找不到接近的人，強制降到需要人工確認
    return { name: player.name, confidence: Math.min(player.confidence, 30), notInRoster: true };
}

function closestMatch(name, roster) {
    let best = null;
    for (const candidate of roster) {
        const distance = levenshtein(name, candidate);
        if (!best || distance < best.distance) {
            best = { name: candidate, distance };
        }
    }
    return best;
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

// ===== 後處理 2：逐局勝負的客觀驗算 =====
// SET_POINTS 加總永遠是 30 分，這個事實不靠模型自報、不受模型信心影響，
// 是唯一能拿來驗證「逐局勝負」的客觀依據（見 SCORESHEET_OCR.md 發現 3：
// 自報總分符合不代表每局都對，但總分不符合則保證有錯）。

function applyCrossCheck(result) {
    const sets = result.sets || [];
    let homePoints = 0, awayPoints = 0;
    const unclearSets = [];

    sets.forEach(s => {
        const def = SET_DEFS.find(d => d.set === s.set);
        if (!def) return;
        if (s.winner?.value === 'home') homePoints += def.points;
        else if (s.winner?.value === 'away') awayPoints += def.points;
        else unclearSets.push(s.set);
    });

    const sumValid = (homePoints + awayPoints) === SET_POINTS_SUM;

    // 出賽限制檢查：同組內同一人不能重複出賽（沿用 admin 既有的分組定義）
    const repeatViolations = checkNoRepeatViolations(sets);

    return {
        ...result,
        crossCheck: {
            computedHomePoints: homePoints,
            computedAwayPoints: awayPoints,
            expectedSum: SET_POINTS_SUM,
            sumValid,
            unclearSets, // 這些局的勝負沒有讀出來，人工確認時要特別注意
            repeatViolations, // 同組內出現重複選手，違反出賽限制
        },
    };
}

function checkNoRepeatViolations(sets) {
    const violations = [];
    for (const group of NO_REPEAT_GROUPS) {
        const seenHome = new Map(); // name -> [set,...]
        const seenAway = new Map();
        for (const setNum of group) {
            const s = sets.find(x => x.set === setNum);
            if (!s) continue;
            for (const p of s.homePlayers || []) {
                if (!p.name) continue;
                if (!seenHome.has(p.name)) seenHome.set(p.name, []);
                seenHome.get(p.name).push(setNum);
            }
            for (const p of s.awayPlayers || []) {
                if (!p.name) continue;
                if (!seenAway.has(p.name)) seenAway.set(p.name, []);
                seenAway.get(p.name).push(setNum);
            }
        }
        for (const [name, appearedIn] of seenHome) {
            if (appearedIn.length > 1) violations.push({ team: 'home', name, sets: appearedIn, group });
        }
        for (const [name, appearedIn] of seenAway) {
            if (appearedIn.length > 1) violations.push({ team: 'away', name, sets: appearedIn, group });
        }
    }
    return violations;
}
