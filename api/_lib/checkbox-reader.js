/**
 * 分紙塗黑框判讀（純影像處理，不經過語言模型）
 *
 * 先攻／勝負這兩類欄位的答案只有「左邊那格有墨跡，還是右邊那格」，
 * 是純粹的視覺量測，不需要理解任何語意。實測 Gemini 在這件事上很不可靠：
 * 正確率在多次重跑之間從 25% 到 75% 大幅跳動，最差的一次 16 局全部回傳
 * 同一個值（模型直接套一個固定答案而不是逐列判讀），而且信心分數不論
 * 對錯都固定落在 90~95，沒有任何鑑別力（見 SCORESHEET_OCR.md 發現 10~12）。
 *
 * 改用直接量墨水覆蓋率：在校正後的固定畫布上，每個方框的位置是已知的，
 * 量框內暗像素比例即可。同一張照片實測先攻 93.8%、勝負 87.5%，
 * 且結果完全可重現（不像呼叫模型每次都不一樣）。
 *
 * 姓名欄仍然交給 Gemini——那才是真正需要辨識能力的部分。
 */

const sharp = require('sharp');
const { CHECKBOX_LAYOUT } = require('./checkbox-layout');

// 框內取樣時四邊各往內縮的比例，避開方框本身的黑色邊框
const INSET = 0.22;
// 低於這個灰階值算「有墨跡」
const DARK_LEVEL = 140;
// 框內暗像素超過這個比例就算已勾選。記錄員實際是在框裡畫螺旋而不是塗滿，
// 覆蓋率大約 40~60%，空白框的雜訊約 0~5%，門檻設在中間偏低處
const INK_RATIO = 0.15;
// 垂直對齊的搜尋範圍（見 findVerticalOffset 的說明）
const OFFSET_RANGE = 60;

/**
 * 判讀 16 局的先攻與勝負。
 * @param {Buffer} rectifiedBuffer 已經過 deskew 校正的分紙影像
 * @returns {Promise<{sets: Array, offset: number, applied: boolean, reason?: string}>}
 */
async function readCheckboxes(rectifiedBuffer) {
    try {
        const { data, info } = await sharp(rectifiedBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
        const img = { data, width: info.width, height: info.height };

        const offset = findVerticalOffset(img);
        const sets = CHECKBOX_LAYOUT.map(row => {
            const cov = {
                faLeft: coverage(img, row.faLeft, offset),
                winLeft: coverage(img, row.winLeft, offset),
                winRight: coverage(img, row.winRight, offset),
                faRight: coverage(img, row.faRight, offset),
            };
            return {
                set: row.set,
                firstAttack: decidePair(cov.faLeft, cov.faRight),
                winner: decidePair(cov.winLeft, cov.winRight),
                coverage: cov,
            };
        });

        return { sets, offset, applied: true };
    } catch (err) {
        console.error('❌ readCheckboxes 失敗:', err);
        return { sets: [], offset: 0, applied: false, reason: 'exception:' + err.message };
    }
}

/**
 * 一組兩格中，哪一格有墨跡。左＝主隊、右＝客隊是版面固定規則。
 *
 * 兩格同時有墨跡或同時空白都代表判讀不出唯一答案，回 unclear 交人工確認，
 * 不要硬猜一個看起來合理的答案。
 */
function decidePair(covLeft, covRight) {
    const diff = covLeft - covRight;
    const absDiff = Math.abs(diff);

    // 兩格墨水覆蓋率差距不足 0.12，代表兩格無顯著相對差異（真正的同亮或同暗空白）
    if (absDiff < 0.12) {
        return { value: 'unclear', confidence: 0 };
    }

    // 只要存在顯著相對差額（例如 0.85 vs 0.22 差距 0.63），較高者即為填寫方框，
    // 不會因背景影子或水印使較低那格 > 0.15 而被誤判成 unclear。
    const confidence = Math.round(Math.min(100, absDiff * 160));
    return { value: diff > 0 ? 'home' : 'away', confidence };
}

function coverage(img, box, offset) {
    const bw = box.x2 - box.x1, bh = box.y2 - box.y1;
    const x1 = Math.round(box.x1 + bw * INSET), x2 = Math.round(box.x2 - bw * INSET);
    const y1 = Math.round(box.y1 + offset + bh * INSET), y2 = Math.round(box.y2 + offset - bh * INSET);

    let dark = 0, total = 0;
    for (let y = y1; y < y2; y++) {
        if (y < 0 || y >= img.height) continue;
        for (let x = x1; x < x2; x++) {
            if (x < 0 || x >= img.width) continue;
            if (img.data[y * img.width + x] < DARK_LEVEL) dark++;
            total++;
        }
    }
    return total > 0 ? dark / total : 0;
}

/**
 * 找出方框座標與實際影像之間的垂直偏移量。
 *
 * 為什麼需要這一步：校正後的畫布尺寸固定，但實際照片跟版面模板之間仍會
 * 有整體性的垂直位移（列印版本的細微差異、定位點偵測的殘留誤差、
 * 分紙為了讓主客兩隊各自填名單而先對折造成的弧形）。實測這個位移可達
 * 20~25px，而列高只有約 58px，不修正就會整排讀到隔壁列或表頭。
 *
 * 校準的依據不需要正確答案：對齊正確時，每一組兩格必定是「一格明顯有墨、
 * 一格明顯空白」，兩格的覆蓋率差距最大；沒對齊時兩格都落在框線或空白處，
 * 數值接近、差距小。取「所有組別覆蓋率差距總和」最大的位移即可。
 */
function findVerticalOffset(img) {
    let best = { offset: 0, score: -1 };
    for (let offset = -OFFSET_RANGE; offset <= OFFSET_RANGE; offset++) {
        let score = 0;
        for (const row of CHECKBOX_LAYOUT) {
            score += Math.abs(coverage(img, row.faLeft, offset) - coverage(img, row.faRight, offset));
            score += Math.abs(coverage(img, row.winLeft, offset) - coverage(img, row.winRight, offset));
        }
        if (score > best.score) best = { offset, score };
    }
    return best.offset;
}

module.exports = { readCheckboxes, _internal: { findVerticalOffset, coverage, decidePair } };
