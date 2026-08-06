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
 *   - 送給 Gemini 之前先用四角定位點把照片透視校正成正的矩形（deskew.js），
 *     讓模型不用自己在歪斜的照片裡判斷左右空間關係——這是 SCORESHEET_OCR.md
 *     發現①（先攻/勝負讀反）的源頭修正，不是事後修補
 */

const { deskewScoresheet } = require('./_lib/deskew');
const { readCheckboxes } = require('./_lib/checkbox-reader');

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

        // 校正失敗（例如定位點被手指擋住、照片裁太緊）就照原圖送出，
        // 不要因為校正這一步失敗就整個辨識請求失敗
        const deskew = await deskewScoresheet(Buffer.from(imageData, 'base64'));
        const finalImageData = deskew.applied ? deskew.buffer.toString('base64') : imageData;
        const finalMimeType = deskew.applied ? 'image/jpeg' : resolvedMimeType;

        const geminiResult = await callGemini({
            apiKey,
            imageData: finalImageData,
            mimeType: finalMimeType,
            gameCode,
            homeTeam,
            awayTeam,
            homeRoster,
            awayRoster,
        });

        const withSides = mapSidesToTeams(geminiResult);

        // 塗黑框改用影像處理判讀，蓋掉模型給的先攻／勝負（見 overrideWithPixelReading）。
        // 需要校正成功才有固定座標可量，校正失敗就只能沿用模型的答案。
        const pixelRead = deskew.applied ? await readCheckboxes(deskew.buffer) : { applied: false, reason: 'deskew-skipped' };
        const withPixelBoxes = overrideWithPixelReading(withSides, pixelRead);

        const withRosterMatch = applyRosterMatching(withPixelBoxes, homeRoster, awayRoster);
        const withCrossCheck = applyCrossCheck(withRosterMatch);
        withCrossCheck.deskew = { applied: deskew.applied, reason: deskew.reason || null };
        withCrossCheck.checkboxSource = pixelRead.applied ? 'pixel' : 'gemini';

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
- 主表格 16 列（SET1~SET16），每列從左到右依序是 7 個區塊：
  1. 最左：主隊選手（一或多個手寫姓名，依局別人數而定）
  2. 「先攻」塗黑方框（左側）
  3. 「勝」塗黑方框（左側，緊鄰 SET 標籤）
  4. 正中：SET 編號與局別說明
  5. 「勝」塗黑方框（右側，緊鄰 SET 標籤）
  6. 「先攻」塗黑方框（右側）
  7. 最右：客隊選手（一或多個手寫姓名）

各局人數：
${setList}

重要規則：
1. **主隊選手只能是以下名單中的人，不要辨識成名單外的名字**：
   ${homeRoster.join('、')}
2. **客隊選手只能是以下名單中的人**：
   ${awayRoster.join('、')}
3. 塗黑方框的填法可能是「螺旋塗鴉」而不是整格塗滿，只要框內有明顯筆跡（無論形狀）都算「已勾選」。
4. 同一列的兩個左側框（緊鄰 SET 標籤左邊）可能同時被塗黑，兩個右側框（緊鄰 SET 標籤右邊）也可能同時被塗黑，這是正常情況（代表同一隊既先攻又獲勝），不是重複勾選的錯誤。
5. 若某個欄位字跡潦草、模糊到你沒有把握，請誠實給出低信心分數（甚至 0），**不要用猜測填一個看起來合理但沒有根據的答案**。姓名讀不出來就回傳 null，塗黑框讀不出來就回傳 "unclear"。
6. 場次代號（gamecode）如果照片上有寫，讀出來放進 gameCode 欄位；這場的實際場次是「${gameCode || '未提供'}」，僅供你交叉核對，不代表照片上一定寫得一致。
7. **出賽限制（同組內同一人不能出賽超過一次）**：以下每組 SET 屬於同一組，同一位選手在同一組內只會出現一次——如果你辨識出同一人在同一組出現兩次以上，代表你至少有一次認錯人，回去重新檢查那幾局的筆跡，不要直接回傳矛盾的結果：
   - SET1、SET4 為一組
   - SET6、SET9 為一組
   - SET11、SET12 為一組
   - SET13、SET14 為一組
8. **firstAttack 與 winner 只回答「塗黑的框在 SET 標籤的左邊還右邊」（left/right），不要自己換算成主隊或客隊**——每一列從左到右固定是「主隊選手、先攻框、勝框、SET 標籤、勝框、先攻框、客隊選手」，哪一側是主隊、哪一側是客隊已經是固定的版面規則，由我們自己的程式判斷，你只需要誠實回答視覺上看到塗黑框在哪一側，不要做語意翻譯。
9. **塗改（劃掉重寫）的姓名**：記錄員有時會把寫錯的名字劃掉，在旁邊補寫正確的名字。這種格子請照以下方式處理：
   - **被劃掉的名字一律不是答案**，要讀的是補寫上去的那一個
   - 只要這一格出現任何劃掉的痕跡（刪除線、塗掉、蓋掉），就把該格的 strikethrough 設為 true，不管你對補寫的名字有多確定
   - 如果劃掉之後補寫的字看不清楚、或根本分不出哪個才是最終答案，name 回傳 null

信心分數（0~100）不是憑印象打的整體感覺分，是針對「這個具體欄位」的判讀依據給分，請照下面的判斷基準：
- 90~100：筆跡清楚、無歧義，換一個人來看也只會有一種讀法
- 60~89：筆跡看得出來，但有一點模糊、可能跟名單裡另一個名字接近，或塗黑框邊緣沒塗滿、判斷需要一點推論
- 30~59：筆跡潦草、被遮擋一部分，或塗黑框介於「像有塗」跟「像沒塗」之間，你其實是用猜的
- 0~29：幾乎看不出來、被遮擋、或完全空白
**同一張照片裡不應該所有欄位都給 90 以上**——如果你發現自己對每一格都很有把握，先停下來重新檢查有沒有欄位其實只是「大概猜的」但被你直覺打了高分。`;
}

function buildResponseSchema() {
    const playerField = {
        type: 'OBJECT',
        properties: {
            name: { type: 'STRING', nullable: true },
            confidence: { type: 'INTEGER' },
            // 這一格有沒有被劃掉重寫的痕跡。實測發現塗改格是姓名誤判的主要來源：
            // 模型可能讀到被劃掉的舊名字卻給出高信心（見 SCORESHEET_OCR.md 發現 13）
            strikethrough: { type: 'BOOLEAN' },
        },
        required: ['name', 'confidence', 'strikethrough'],
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
                        // 故意要求「左邊還右邊」而不是直接要求「主隊還客隊」——
                        // 實測發現直接要求 home/away 時，模型會穩定地把兩側搞反
                        // （100% 精確反過來，不是隨機亂猜），懷疑是「主隊」「客隊」
                        // 這種語意標籤在模型內部對應到左右哪一側時發生系統性錯位。
                        // 改成只回答視覺上「哪一側」，把「左側=主隊、右側=客隊」
                        // 這個固定版面規則交給我們自己的程式碼做，不靠模型翻譯語意。
                        firstAttack: choiceField(['left', 'right', 'unclear']),
                        winner: choiceField(['left', 'right', 'unclear']),
                    },
                    required: ['set', 'homePlayers', 'awayPlayers', 'firstAttack', 'winner'],
                },
            },
            drinkingBonus: choiceField(['home', 'away', 'none', 'unclear']),
        },
        required: ['sets', 'drinkingBonus'],
    };
}

// ===== 後處理 0：左右側轉換成主客隊 =====
// Gemini 只負責回答視覺上的「左邊還右邊」（見 buildPrompt 規則 8 的說明），
// 「左側=主隊、右側=客隊」這個固定版面規則由這裡的程式碼決定，不假手模型
// 做語意翻譯——這是實測發現直接要求模型輸出 home/away 時會穩定讀反
// （100% 精確反過來）之後的修正，SCORESHEET_OCR.md 發現 10/11 有記錄。

const SIDE_TO_TEAM = { left: 'home', right: 'away', unclear: 'unclear' };

function mapSidesToTeams(result) {
    const sets = (result.sets || []).map(s => ({
        ...s,
        firstAttack: mapSideField(s.firstAttack),
        winner: mapSideField(s.winner),
    }));
    return { ...result, sets };
}

function mapSideField(field) {
    if (!field) return field;
    const mapped = SIDE_TO_TEAM[field.value];
    return { ...field, value: mapped === undefined ? field.value : mapped };
}

// ===== 後處理 0.5：塗黑框改用影像判讀的結果 =====
// 先攻／勝負是純視覺量測（哪一格有墨跡），不需要語意理解，交給模型反而不穩：
// 同一張照片多次重跑，正確率在 25%~75% 之間跳，最差一次 16 局全部回同一個值，
// 而且信心分數不論對錯都固定在 90~95。改量墨水覆蓋率後同一張照片得到
// 先攻 93.8%、勝負 87.5%，且三個錯誤全部落在 unclear／信心 0，
// 沒有任何「高信心答錯」。詳見 SCORESHEET_OCR.md 發現 14。

function overrideWithPixelReading(result, pixelRead) {
    if (!pixelRead.applied) return result;

    const bySet = new Map(pixelRead.sets.map(s => [s.set, s]));
    const sets = (result.sets || []).map(s => {
        const px = bySet.get(s.set);
        if (!px) return s;
        return { ...s, firstAttack: px.firstAttack, winner: px.winner };
    });
    return { ...result, sets };
}

// ===== 後處理 1：名單模糊比對 =====
// 模型有時仍會回傳名單外的名字（尤其是低信心的情況），這裡再比對一次，
// 不完全信任模型自己「保證只選名單內」的承諾。

// 塗改格的信心懲罰。分紙上把寫錯的名字劃掉、旁邊補寫，是姓名誤判的主要來源：
// 實測有格子讀到「被劃掉的舊名字」卻給了 90 分信心（見 SCORESHEET_OCR.md 發現 13）。
// 這種格子不論模型自己多有把握，都不該自動填入——扣 50 分讓它必定跌出
// 「高信心自動填入」的範圍，強制走人工確認。
//
// 正規做法是請記錄員用修正液把寫錯的字清乾淨再重寫（劃掉重寫本來就不是
// 給機器判讀的寫法，就像考卷劃記不能打叉重選），這點會另外向各隊說明。
const STRIKETHROUGH_PENALTY = 50;

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
        return { name: null, confidence: 0, strikethrough: !!(player && player.strikethrough) };
    }

    const matched = matchName(player, roster);
    if (!player.strikethrough) return matched;

    return {
        ...matched,
        confidence: Math.max(0, matched.confidence - STRIKETHROUGH_PENALTY),
        strikethrough: true,
    };
}

function matchName(player, roster) {
    if (roster.includes(player.name)) {
        return player; // 完全對上，信心分數維持模型給的值
    }

    // 大小寫不同不算讀錯——名單裡存的是「lucy」「Joy」，分紙上寫的是「Lucy」「joy」，
    // 指的是同一個人。若交給下面的編輯距離處理，會被當成差一個字而白白扣 20 分信心，
    // 讓沒讀錯的欄位掉到自動填入門檻以下、被標成需人工確認。
    const caseInsensitive = roster.find(r => r.toLowerCase() === player.name.toLowerCase());
    if (caseInsensitive) {
        return { ...player, name: caseInsensitive };
    }

    // 差一個字時，關鍵不是「差多少」而是「有沒有第二個一樣近的人」。
    // 實測名單裡 164 人有 55 組彼此只差一個字（中文綽號「小X」「阿X」太常見，
    // 例如有點傻的小飛／小齊／小安三人互為距離 1）。這種情況硬猜等於擲骰子，
    // 必須重扣讓它落到人工確認；反之若只有一個人這麼近（例如分紙寫「Andy」、
    // 名單登記「Andi」，隊上沒有第二個相近的名字），那就是單純的拼寫出入，
    // 幾乎沒有認錯的空間，不該白白扣到需要人工複查。
    const ranked = rankByDistance(player.name, roster);
    const best = ranked[0], runnerUp = ranked[1];
    if (best && best.distance <= 1) {
        const ambiguous = runnerUp && runnerUp.distance === best.distance;
        const penalty = ambiguous ? 30 : 5;
        return { ...player, name: best.name, confidence: Math.max(0, Math.min(player.confidence, 100) - penalty) };
    }
    // 名單裡完全找不到接近的人，強制降到需要人工確認
    return { ...player, name: player.name, confidence: Math.min(player.confidence, 30), notInRoster: true };
}

// 回傳整份名單依相近程度排序的結果，而不是只有最接近的那一個——
// 判斷可不可信要看「最近的跟第二近的差多少」，只拿到冠軍看不出有沒有並列。
// 比對時忽略大小寫，否則 Lucy/lucy 這種差異會佔掉唯一的一格距離額度。
function rankByDistance(name, roster) {
    return roster
        .map(candidate => ({ name: candidate, distance: levenshtein(name.toLowerCase(), candidate.toLowerCase()) }))
        .sort((a, b) => a.distance - b.distance);
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
