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
function darkRunLength(integral, width, height, cx, cy, dx, dy, thickness, maxDist, step) {
    let dist = 0;
    while (dist < maxDist) {
        const nx = cx + dx * dist, ny = cy + dy * dist;
        const m = dx !== 0
            ? regionMean(integral, width, height, nx - step / 2, ny - thickness / 2, nx + step / 2, ny + thickness / 2)
            : regionMean(integral, width, height, nx - thickness / 2, ny - step / 2, nx + thickness / 2, ny + step / 2);
        if (m > 150) break; // 遇到亮色，暗色延伸到此為止
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

    const thickness = half * 1.2, step = Math.max(2, half * 0.4), maxDist = half * 6;
    const runLeft = darkRunLength(integral, width, height, cx, cy, -1, 0, thickness, maxDist, step);
    const runRight = darkRunLength(integral, width, height, cx, cy, 1, 0, thickness, maxDist, step);
    const runUp = darkRunLength(integral, width, height, cx, cy, 0, -1, thickness, maxDist, step);
    const runDown = darkRunLength(integral, width, height, cx, cy, 0, 1, thickness, maxDist, step);
    // 角落的定位點本來就會有一側（靠紙張外緣、朝桌子的方向）暗色延伸很遠，
    // 這是正常的，不能當「不是方塊」的證據。真正該排除的是「兩個相對方向
    // 同時都延伸很遠」——那才是貫穿紙面的一條線（例如表頭黑條），
    // 方塊只會有單側連到外部暗色，不會兩側同時連通。
    const bothDarkHoriz = runLeft >= maxDist && runRight >= maxDist;
    const bothDarkVert = runUp >= maxDist && runDown >= maxDist;

    // 定位點是印刷實心方塊，中心區域標準差很低；表頭儲存格黑底上壓著白字，
    // 標準差高很多。這是跟形狀無關、獨立的一個判別依據。
    const centerStd = regionStd(integral, integralSq, width, height, cx - half, cy - half, cx + half, cy + half);

    const isCompact = !bothDarkHoriz && !bothDarkVert && centerStd < 35;

    return { contrast, centerMean, isCompact };
}

// 在指定的搜尋範圍內，用「中心暗、外圍亮」對比分數找出最像定位點的位置。
// 先用粗網格掃過整個搜尋範圍定出大概位置，再用細網格在那附近精修座標——
// 粗網格步距約 markSize/4（十幾個像素），直接拿粗網格結果去解 homography，
// 誤差會被放大到輸出畫布上，四個角沒對齊，邊緣就會留下沒切乾淨的桌面。
function findMarkByContrast(integral, integralSq, width, height, sx1, sy1, sx2, sy2, markSize) {
    const half = markSize / 2;
    const ringOuter = markSize * 1.8; // 外圍取樣範圍：中心方塊的 1.8 倍
    let best = null;

    const coarseStep = Math.max(1, Math.round(markSize / 4));
    for (let cy = sy1 + half; cy < sy2 - half; cy += coarseStep) {
        for (let cx = sx1 + half; cx < sx2 - half; cx += coarseStep) {
            const { contrast, centerMean, isCompact } = contrastAt(integral, integralSq, width, height, cx, cy, half, ringOuter);
            if (centerMean < 110 && contrast > 25 && isCompact) {
                if (!best || contrast > best.contrast) {
                    best = { x: cx, y: cy, contrast, centerMean };
                }
            }
        }
    }
    if (!best) return null;

    // 精修：在粗網格結果附近 ±coarseStep 範圍內用 1px 步距重新找峰值
    const refineStep = 1;
    let refined = best;
    for (let cy = best.y - coarseStep; cy <= best.y + coarseStep; cy += refineStep) {
        for (let cx = best.x - coarseStep; cx <= best.x + coarseStep; cx += refineStep) {
            if (cx - half < sx1 || cx + half > sx2 || cy - half < sy1 || cy + half > sy2) continue;
            const { contrast, centerMean, isCompact } = contrastAt(integral, integralSq, width, height, cx, cy, half, ringOuter);
            if (isCompact && contrast > refined.contrast) {
                refined = { x: cx, y: cy, contrast, centerMean };
            }
        }
    }
    return refined;
}

function detectFourCorners(gray, width, height) {
    // 定位點實際大小未知（照片框得緊或鬆都有可能），嘗試幾種相對畫面寬度的尺寸，
    // 取每個角落裡對比分數最高的結果
    const markSizeCandidates = [width * 0.025, width * 0.04, width * 0.06];

    // 四個角落的搜尋範圍：只搜尋畫面四角外圍 32% 的區域，不要往中間伸太深。
    // 定位點本來就印在版面最外側（實測約在畫面 11~21% 深度處），伸進中間深處
    // 反而容易撞到主表格的黑色表頭列——表頭列是分段的黑色儲存格，跟定位點
    // 一樣是「小面積深色」，光靠形狀很難跟定位點分開，不如直接把搜尋範圍
    // 限制在表頭列不會出現的外圍地帶。代價是：如果照片把紙張裁得極緊、
    // 定位點被推到畫面很深的地方，可能會偵測失敗——但那種情況本來就該
    // 要求使用者重拍，四角定位點的上傳提示已經有這個要求。
    const M = 0.32;
    const windows = {
        tl: [0, 0, width * M, height * M],
        tr: [width * (1 - M), 0, width, height * M],
        bl: [0, height * (1 - M), width * M, height],
        br: [width * (1 - M), height * (1 - M), width, height],
    };

    const integral = buildIntegral(gray, width, height);
    const integralSq = buildIntegralSq(gray, width, height);
    const corners = {};
    for (const [key, [x1, y1, x2, y2]] of Object.entries(windows)) {
        let best = null;
        for (const markSize of markSizeCandidates) {
            const found = findMarkByContrast(integral, integralSq, width, height, x1, y1, x2, y2, markSize);
            if (found && (!best || found.contrast > best.contrast)) best = found;
        }
        if (!best) return null; // 四個角有任何一個找不到，整體判定失敗
        corners[key] = best;
    }
    return corners;
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
    _internal: { detectFourCorners, findMarkByContrast, buildIntegral, buildIntegralSq, regionStd },
};
