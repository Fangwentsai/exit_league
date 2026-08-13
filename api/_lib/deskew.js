/**
 * 分紙照片透視校正
 *
 * 用四角的黑色定位點把拍歪、有透視變形的照片「拉回」成正的矩形，
 * 再送給 Gemini 辨識。這樣模型不用自己猜哪個框在哪一側，
 * 空間對應的錯誤（SCORESHEET_OCR.md 發現①：先攻/勝負讀反）
 * 從源頭就少了大半理由發生。
 *
 * 做法分兩階段，不是憑空找「照片裡最暗的東西」——真實照片常在深色木桌上拍，
 * 桌面本身比定位點還暗、還大片，直接找暗點會找到桌子而不是定位點：
 *
 *   階段一：先找出「紙張」的大致範圍（亮色區域 vs 深色桌面背景）
 *   階段二：只在紙張四個角落的搜尋窗內找定位點（此時背景是已知的亮紙，
 *           定位點的暗色反而很好認）
 *
 * 找到四個定位點座標後，用四點透視變換（homography）把照片校正成
 * 固定比例的矩形，交給 sharp 重新編碼輸出。
 *
 * 找不到清楚的四個角（例如照片裁太緊、定位點被手指擋住）就放棄校正，
 * 回傳原圖，讓呼叫端知道 applied:false，不要假裝校正成功。
 */

const sharp = require('sharp');

// 輸出的校正後畫布尺寸（維持 A4 直式比例，210:297）
const OUT_WIDTH = 1050;
const OUT_HEIGHT = Math.round(OUT_WIDTH * 297 / 210); // 1487

// ========== 在畫面四個象限裡找定位點 ==========
// 不先框「整張紙」再找角——紙張被拍歪時是個梯形，用「這一行/這一列大部分
// 要是亮色」的門檻去框整張紙，會把上下左右比較窄的部分整段誤判成「沒有紙」，
// 導致框出來的範圍嚴重縮水（實測過，寬高各少估了 20~40%）。
//
// 改成直接找定位點本身的特徵：一小塊暗色、被亮色紙張包在外圍。
// 這個特徵桌面不會有——桌面是大片均勻的暗，任何一點的外圍還是暗的；
// 只有「紙上印的黑方塊」才會同時滿足「中心暗」加「外圍亮」。
// 用積分圖（prefix sum）算任意矩形區域的平均亮度，才有辦法在合理時間內
// 對整張圖做滑動窗搜尋。
function buildIntegral(gray, width, height) {
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += gray[y * width + x];
            integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
        }
    }
    return integral;
}

function regionMean(integral, width, height, x1, y1, x2, y2) {
    // 積分圖索引必須是整數——座標常是滑動窗算出來的小數，
    // 直接拿小數當 TypedArray 索引會靜默回傳 undefined（不是最近整數位置），
    // 整段 sum 就變成 NaN 而不是報錯，非常不容易發現。
    x1 = Math.max(0, Math.floor(x1)); y1 = Math.max(0, Math.floor(y1));
    x2 = Math.min(width, Math.ceil(x2)); y2 = Math.min(height, Math.ceil(y2));
    const w1 = width + 1;
    const sum = integral[y2 * w1 + x2] - integral[y1 * w1 + x2] - integral[y2 * w1 + x1] + integral[y1 * w1 + x1];
    const area = (x2 - x1) * (y2 - y1);
    return area > 0 ? sum / area : 255;
}

// 平方值的積分圖，跟 regionMean 搭配可以算出區域內像素值的標準差
function buildIntegralSq(gray, width, height) {
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            const v = gray[y * width + x];
            rowSum += v * v;
            integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
        }
    }
    return integral;
}

// 定位點是印刷實心黑方塊，內部像素值幾乎不變（標準差很低）；
// 表格黑色表頭列裡壓著白色文字（「主先攻」之類），黑底白字讓內部像素值
// 變化很大（標準差高很多）。這是分辨兩者最直接的特徵，比單靠形狀可靠。
function regionStd(integral, integralSq, width, height, x1, y1, x2, y2) {
    x1 = Math.max(0, Math.floor(x1)); y1 = Math.max(0, Math.floor(y1));
    x2 = Math.min(width, Math.ceil(x2)); y2 = Math.min(height, Math.ceil(y2));
    const w1 = width + 1;
    const area = (x2 - x1) * (y2 - y1);
    if (area <= 0) return 0;
    const sum = integral[y2 * w1 + x2] - integral[y1 * w1 + x2] - integral[y2 * w1 + x1] + integral[y1 * w1 + x1];
    const sumSq = integralSq[y2 * w1 + x2] - integralSq[y1 * w1 + x2] - integralSq[y2 * w1 + x1] + integralSq[y1 * w1 + x1];
    const mean = sum / area;
    const variance = Math.max(0, sumSq / area - mean * mean);
    return Math.sqrt(variance);
}

// 從中心點沿一個方向逐步走，量暗色一路延伸多遠（用小步進的窄條 regionMean，
// 不是單點取樣——分紙表頭列中間常有白色空隙，單點取樣容易剛好取樣到那個
// 空隙而誤判成「這裡已經亮了」）。回傳暗色延伸的距離，越大代表越像一條線
// 而不是一個獨立的小方塊。
//
// brightThreshold 必須由呼叫端依當地亮度算出來，不能寫死一個固定值：
// 實測照片的上下亮度差很大（同一張照片上方紙面量到 224、左下角只有 110~143，
// 桌燈打光不均），寫死 150 會讓偏暗那一角的紙面被當成「暗色」，
// 於是每個方向都走到上限、真正的定位點反而被判定成一條線而漏掉。
function darkRunLength(integral, width, height, cx, cy, dx, dy, thickness, maxDist, step, brightThreshold) {
    let dist = 0;
    while (dist < maxDist) {
        const nx = cx + dx * dist, ny = cy + dy * dist;
        const m = dx !== 0
            ? regionMean(integral, width, height, nx - step / 2, ny - thickness / 2, nx + step / 2, ny + thickness / 2)
            : regionMean(integral, width, height, nx - thickness / 2, ny - step / 2, nx + thickness / 2, ny + step / 2);
        if (m > brightThreshold) break; // 遇到亮色，暗色延伸到此為止
        dist += step;
    }
    return dist;
}

// 對某個中心點算「中心暗、外圍亮」的對比分數。
//
// 光是「中心暗、外圍亮」還不夠——分紙表格的黑色表頭列是一條橫貫整列的
// 粗黑線，當搜尋窗的高度剛好接近那條線的粗細時，垂直方向一樣會量到
// 「中心暗、上下亮」，跟真正的定位點方塊沒兩樣（實測過，真的會誤判）。
// 差別在：定位點方塊往任一水平方向延伸的暗色範圍很短（方塊邊長左右就沒了），
// 表頭黑線往左右延伸的暗色範圍遠遠超過方塊本身大小。用「暗色實際延伸多遠」
// 而不是單點取樣，才不會被表頭列中間偶然出現的白色空隙騙過。
function contrastAt(integral, integralSq, width, height, cx, cy, half, ringOuter) {
    const centerMean = regionMean(integral, width, height, cx - half, cy - half, cx + half, cy + half);
    const outerMean = regionMean(integral, width, height, cx - ringOuter / 2, cy - ringOuter / 2, cx + ringOuter / 2, cy + ringOuter / 2);
    // outerMean 是「外圍+中心」混合的平均，中心暗會把它往下拉，
    // 用 outerMean - centerMean 當對比分數：中心夠暗、外圍夠亮，分數才會高
    const contrast = outerMean - centerMean;

    // 定位點印在紙面內側，四周都留有白邊（版面上方塊約 7mm、外緣留白也約 7mm），
    // 所以往上下左右任一方向走，暗色都應該在很短的距離內就碰到白紙而中止。
    //
    // 這個「四個方向都要中止」必須全部成立，不能放寬成「相對的兩個方向都暗才排除」——
    // 實測踩過這個坑：紙張本身的外角落（例如照片裡紙的左上角）往外兩個方向是深色桌面、
    // 往內兩個方向是亮紙，放寬版的條件會讓它整個矇混過關，四個角有三個抓到桌面而不是
    // 定位點，硬拉出來的校正結果自然是歪的。
    const thickness = half * 1.2, step = Math.max(2, half * 0.4), maxDist = half * 6;
    // 亮暗分界取中心與外圍之間偏外圍的位置，隨當地光線自動調整
    const brightThreshold = centerMean + (outerMean - centerMean) * 0.6;
    const runLeft = darkRunLength(integral, width, height, cx, cy, -1, 0, thickness, maxDist, step, brightThreshold);
    const runRight = darkRunLength(integral, width, height, cx, cy, 1, 0, thickness, maxDist, step, brightThreshold);
    const runUp = darkRunLength(integral, width, height, cx, cy, 0, -1, thickness, maxDist, step, brightThreshold);
    const runDown = darkRunLength(integral, width, height, cx, cy, 0, 1, thickness, maxDist, step, brightThreshold);
    const surroundedByPaper = runLeft < maxDist && runRight < maxDist && runUp < maxDist && runDown < maxDist;

    // 曾經想用「中心區域標準差低」（實心印刷 vs 表頭黑底白字）當額外判別依據，
    // 實測後拿掉：真實照片裡定位點的標準差量到 44~63（對焦模糊、JPEG 壓縮讓
    // 邊緣過渡糊掉，小視窗裡邊緣佔比又高），跟表頭儲存格根本分不開，
    // 設任何門檻都會先擋掉真正的定位點。改由四點的幾何比例來排除誤判
    // （見 detectFourCorners / scoreQuad），那是強度高得多的判別依據。
    const isCompact = surroundedByPaper;

    return { contrast, centerMean, isCompact };
}

// 在指定的搜尋範圍內，收集所有像定位點的候選位置（不是只取最高分那一個）。
//
// 只取單一最高分的做法實測不可靠：定位點在真實照片裡是「中灰色」而不是純黑
// （量到約 111~142，不是想像中的接近 0），邊緣又因為對焦與壓縮而糊掉，
// 用嚴格的亮度／標準差門檻去挑，會把真正的定位點擋掉、反而放行表格的黑色
// 表頭儲存格。這裡改成放寬門檻、保留多個候選，正確答案由呼叫端用四點之間
// 已知的幾何比例挑出來（見 detectFourCorners）。
function collectMarkCandidates(integral, integralSq, width, height, sx1, sy1, sx2, sy2, markSize) {
    const half = markSize / 2;
    const ringOuter = markSize * 1.8; // 外圍取樣範圍：中心方塊的 1.8 倍
    const found = [];

    const step = Math.max(2, Math.round(markSize / 5));
    for (let cy = Math.max(half, sy1); cy < Math.min(height - half, sy2); cy += step) {
        for (let cx = Math.max(half, sx1); cx < Math.min(width - half, sx2); cx += step) {
            const { contrast, centerMean, isCompact } = contrastAt(integral, integralSq, width, height, cx, cy, half, ringOuter);
            if (centerMean < 170 && contrast > 30 && isCompact) {
                found.push({ x: cx, y: cy, contrast, centerMean, markSize });
            }
        }
    }
    return found;
}

// 分紙版面上四個定位點中心所形成的矩形，高寬比是固定的（量自 pages/scoresheet.html
// 實際渲染結果：寬 729.45、高 1023.62）。照片再怎麼歪，這個比例都是已知的先驗知識，
// 拿來從一堆候選裡挑出唯一正確的四點組合，比單靠每個點自己的亮度特徵可靠得多。
const SHEET_MARK_ASPECT = 1023.62 / 729.45; // ≈ 1.403

// 四個夾角容許偏離 90 度多少（度）。
//
// 對邊比例與長寬比都對、四個角卻不是直角，是「其中一個點抓到不相干的東西」
// 最明顯的徵兆——實測過一張把筆電螢幕拍進畫面的照片，左上角抓到螢幕邊框，
// 拉出來的四邊形對邊比 0.96/0.76、長寬比誤差只有 1%，三個既有檢查全部放行，
// 但四個夾角是 59°/126°/99°/77°，最大偏差 36°。
//
// 門檻取 25°：用相機模型模擬「紙張繞兩軸各傾斜 25 度以內」的真實透視，
// 最大夾角偏差是 21°，25° 兩邊都留得下餘裕。傾斜再大的照片本來就不該收——
// 那種角度連校正後的字都糊掉了。
const MAX_ANGLE_DEV_DEG = 25;

// 回傳四個夾角中偏離 90 度最多的那個偏差量（度）
function maxCornerAngleDev(tl, tr, bl, br) {
    const angle = (p, a, b) => {
        const v1x = a.x - p.x, v1y = a.y - p.y;
        const v2x = b.x - p.x, v2y = b.y - p.y;
        const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
        if (n === 0) return 0;
        const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n));
        return Math.acos(cos) * 180 / Math.PI;
    };
    return Math.max(
        Math.abs(angle(tl, tr, bl) - 90),
        Math.abs(angle(tr, tl, br) - 90),
        Math.abs(angle(bl, br, tl) - 90),
        Math.abs(angle(br, bl, tr) - 90),
    );
}

function scoreQuad(tl, tr, bl, br) {
    // 位置關係必須合理：左邊的點要真的在左邊、上面的點要真的在上面
    if (!(tl.x < tr.x && bl.x < br.x && tl.y < bl.y && tr.y < br.y)) return null;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const top = dist(tl, tr), bottom = dist(bl, br);
    const left = dist(tl, bl), right = dist(tr, br);
    if (top < 1 || left < 1) return null;

    // 平面矩形在透視下對邊會不等長，但不會差太多；差太多代表選到不相干的點
    if (Math.min(top, bottom) / Math.max(top, bottom) < 0.65) return null;
    if (Math.min(left, right) / Math.max(left, right) < 0.65) return null;

    const w = (top + bottom) / 2, h = (left + right) / 2;
    const aspectErr = Math.abs(h / w - SHEET_MARK_ASPECT) / SHEET_MARK_ASPECT;
    if (aspectErr > 0.3) return null; // 比例差三成以上，不可能是同一張分紙的四角

    // 矩形在透視下四個角仍然接近直角，歪掉代表有一個點根本不在紙上
    if (maxCornerAngleDev(tl, tr, bl, br) > MAX_ANGLE_DEV_DEG) return null;

    const area = w * h;
    const contrastSum = tl.contrast + tr.contrast + bl.contrast + br.contrast;
    // 面積越大越好（定位點在版面最外緣，正確組合會framing 出最大的四邊形）、
    // 對比越高越好、比例誤差越小越好
    return area * (1 + contrastSum / 400) / (1 + aspectErr * 5);
}

function detectFourCorners(gray, width, height) {
    // 定位點在畫面上的實際大小取決於拍照時框得多緊，多試幾種尺寸；
    // 尺寸抓得比實際小太多時，連外圍取樣框都還落在方塊內部，對比度會算不出來
    const markSizeCandidates = [width * 0.018, width * 0.025, width * 0.035, width * 0.05];

    // 四個角落的搜尋範圍：只搜尋畫面四角外圍 38% 的區域，不要往中間伸太深，
    // 免得撞進主表格的黑色表頭列。代價是照片若把紙張裁得極緊可能偵測失敗，
    // 但那種情況本來就該請使用者重拍（上傳提示已要求四角定位點入鏡）。
    const M = 0.38;
    const windows = {
        tl: [0, 0, width * M, height * M],
        tr: [width * (1 - M), 0, width, height * M],
        bl: [0, height * (1 - M), width * M, height],
        br: [width * (1 - M), height * (1 - M), width, height],
    };

    const integral = buildIntegral(gray, width, height);
    const integralSq = buildIntegralSq(gray, width, height);

    const perCorner = {};
    for (const [key, [x1, y1, x2, y2]] of Object.entries(windows)) {
        let all = [];
        for (const markSize of markSizeCandidates) {
            all = all.concat(collectMarkCandidates(integral, integralSq, width, height, x1, y1, x2, y2, markSize));
        }
        all.sort((a, b) => b.contrast - a.contrast);

        // 同一個定位點會被不同尺寸、鄰近位置重複找到，只保留彼此距離夠遠的代表
        const picked = [];
        for (const c of all) {
            if (picked.some(p => Math.hypot(p.x - c.x, p.y - c.y) < markSizeCandidates[1])) continue;
            picked.push(c);
            if (picked.length >= 6) break;
        }
        if (picked.length === 0) return null; // 這個角完全沒有候選，放棄校正
        perCorner[key] = picked;
    }

    // 從四個角各自的候選中，挑出最符合分紙已知幾何比例的組合
    let best = null;
    for (const tl of perCorner.tl) {
        for (const tr of perCorner.tr) {
            for (const bl of perCorner.bl) {
                for (const br of perCorner.br) {
                    const score = scoreQuad(tl, tr, bl, br);
                    if (score !== null && (!best || score > best.score)) {
                        best = { score, tl, tr, bl, br };
                    }
                }
            }
        }
    }
    if (!best) return null; // 沒有任何組合說得通，寧可不校正也不要硬拉出歪的結果

    return { tl: best.tl, tr: best.tr, bl: best.bl, br: best.br };
}

// ========== 四點透視變換（homography）==========
// 解 8 元一次方程組（4 個對應點各給 2 條方程式），得到
// X = (a*x+b*y+c)/(g*x+h*y+1)，Y = (d*x+e*y+f)/(g*x+h*y+1)
function solveHomography(src, dst) {
    // src、dst 皆為 [{x,y}, {x,y}, {x,y}, {x,y}]，依 tl,tr,bl,br 順序
    const A = [];
    const B = [];
    for (let i = 0; i < 4; i++) {
        const { x, y } = src[i];
        const { x: X, y: Y } = dst[i];
        A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); B.push(X);
        A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); B.push(Y);
    }
    const h = gaussianSolve(A, B); // [a,b,c,d,e,f,g,h]
    if (!h) return null;
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function gaussianSolve(A, B) {
    const n = A.length;
    const M = A.map((row, i) => [...row, B[i]]);
    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
        }
        if (Math.abs(M[pivot][col]) < 1e-10) return null; // 無解或病態，放棄
        [M[col], M[pivot]] = [M[pivot], M[col]];
        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const factor = M[r][col] / M[col][col];
            for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
        }
    }
    return M.map((row, i) => row[n] / row[i]);
}

function applyHomography(H, x, y) {
    const [a, b, c, d, e, f, g, h] = H;
    const denom = g * x + h * y + 1;
    return { x: (a * x + b * y + c) / denom, y: (d * x + e * y + f) / denom };
}

// ========== 依 homography 反向取樣、雙線性插值 ==========
function warpImage(srcRaw, srcW, srcH, channels, Hinv, outW, outH) {
    const out = Buffer.alloc(outW * outH * channels);
    for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
            const { x: sx, y: sy } = applyHomography(Hinv, ox, oy);
            const outIdx = (oy * outW + ox) * channels;
            if (sx < 0 || sy < 0 || sx >= srcW - 1 || sy >= srcH - 1) {
                continue; // 落在來源圖外，維持黑色（幾乎不會發生，四角本來就是校正基準）
            }
            const x0 = Math.floor(sx), y0 = Math.floor(sy);
            const fx = sx - x0, fy = sy - y0;
            for (let c = 0; c < channels; c++) {
                const p00 = srcRaw[(y0 * srcW + x0) * channels + c];
                const p10 = srcRaw[(y0 * srcW + x0 + 1) * channels + c];
                const p01 = srcRaw[((y0 + 1) * srcW + x0) * channels + c];
                const p11 = srcRaw[((y0 + 1) * srcW + x0 + 1) * channels + c];
                const top = p00 * (1 - fx) + p10 * fx;
                const bot = p01 * (1 - fx) + p11 * fx;
                out[outIdx + c] = Math.round(top * (1 - fy) + bot * fy);
            }
        }
    }
    return out;
}

/**
 * 主入口：嘗試對照片做透視校正。
 * @param {Buffer} inputBuffer 原始照片（任何 sharp 支援的格式）
 * @returns {Promise<{buffer: Buffer, applied: boolean, reason?: string}>}
 *          applied=false 時 buffer 就是原圖，呼叫端應照舊使用，
 *          但可以把這個狀態一併記錄下來，代表這張沒有做過空間校正。
 */
async function deskewScoresheet(inputBuffer) {
    try {
        // 偵測用的工作解析度，不需要全解析度，抓角點夠用就好、速度也快很多
        const WORK_WIDTH = 700;
        const meta = await sharp(inputBuffer).metadata();
        if (!meta.width || !meta.height) {
            return { buffer: inputBuffer, applied: false, reason: 'no-metadata' };
        }
        const workHeight = Math.round(WORK_WIDTH * meta.height / meta.width);

        const { data: grayData, info } = await sharp(inputBuffer)
            .rotate() // 依 EXIF 方向先轉正，避免橫拍直拍搞混
            .resize(WORK_WIDTH, workHeight, { fit: 'fill' })
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const corners = detectFourCorners(grayData, info.width, info.height);
        if (!corners) {
            return { buffer: inputBuffer, applied: false, reason: 'corners-not-found' };
        }

        // 把工作解析度的座標換算回（EXIF 轉正後的）原始解析度
        const oriented = await sharp(inputBuffer).rotate().toBuffer({ resolveWithObject: true });
        const oriMeta = oriented.info;
        const scaleX = oriMeta.width / info.width;
        const scaleY = oriMeta.height / info.height;
        const scaleCorner = (c) => ({ x: c.x * scaleX, y: c.y * scaleY });

        const src = [
            scaleCorner(corners.tl), scaleCorner(corners.tr),
            scaleCorner(corners.bl), scaleCorner(corners.br),
        ];
        const dst = [
            { x: 0, y: 0 }, { x: OUT_WIDTH, y: 0 },
            { x: 0, y: OUT_HEIGHT }, { x: OUT_WIDTH, y: OUT_HEIGHT },
        ];

        // 要做「輸出座標 -> 來源座標」的反向取樣，直接用 dst->src 方向解一次
        // homography，比正向解完再求反矩陣簡單。
        const Hinv = solveHomography(dst, src);
        if (!Hinv) {
            return { buffer: inputBuffer, applied: false, reason: 'homography-failed' };
        }

        const { data: rawRgb, info: rawInfo } = await sharp(oriented.data)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const warped = warpImage(rawRgb, rawInfo.width, rawInfo.height, rawInfo.channels, Hinv, OUT_WIDTH, OUT_HEIGHT);

        const outBuffer = await sharp(warped, {
            raw: { width: OUT_WIDTH, height: OUT_HEIGHT, channels: rawInfo.channels },
        }).jpeg({ quality: 90 }).toBuffer();

        return { buffer: outBuffer, applied: true };
    } catch (err) {
        console.error('❌ deskewScoresheet 失敗:', err);
        return { buffer: inputBuffer, applied: false, reason: 'exception:' + err.message };
    }
}

module.exports = {
    deskewScoresheet, OUT_WIDTH, OUT_HEIGHT,
    _internal: { detectFourCorners, collectMarkCandidates, buildIntegral, buildIntegralSq, regionStd, maxCornerAngleDev, scoreQuad, MAX_ANGLE_DEV_DEG },
};
