#!/usr/bin/env node
/**
 * 下載 PhoenixDarts 的 Lv1~Lv30 等級徽章，正規化成同尺寸的 webp
 *   → images/rating30/N.png   原圖（保留備查）
 *   → images/rating30/N.webp  正規化後，網站實際用的
 *
 *   node scripts/phoenix_icons.js
 *
 * 為什麼要正規化：原圖高度都是 44，但寬度從 59px（N1）到 117px
 * （GRAND MASTER 30）不等——徽章裡的字長度不同。直接丟進表格會很麻煩：
 *
 *   - 用 height 固定、width 自動 → 每個圖寬度不一，姓名欄左緣參差不齊
 *   - 用固定的框 + object-fit:contain → 寬的圖被縮更小，實測畫出來的高度
 *     從 19px 掉到 12px，同一排等級圖看起來大小不一
 *
 * 所以把每張圖補到相同畫布（最寬那張的寬度），內容靠左、右邊補透明。
 * 這樣每個 <img> 的框一模一樣，字的高度也一致，CSS 只要指定 height 就好。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '../images/rating30');
const BASE = 'https://images.phoenixdart.com/global/images/common/rating30/';
const LEVELS = 30;

function download(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log('⬇️  下載 Lv1~Lv30…');
    const raw = [];
    for (let lv = 1; lv <= LEVELS; lv++) {
        const buf = await download(`${BASE}${lv}.png`);
        fs.writeFileSync(path.join(OUT_DIR, `${lv}.png`), buf);
        const meta = await sharp(buf).metadata();
        raw.push({ lv, buf, w: meta.width, h: meta.height });
    }

    const maxW = Math.max(...raw.map(r => r.w));
    const maxH = Math.max(...raw.map(r => r.h));
    console.log(`   原圖尺寸 ${Math.min(...raw.map(r => r.w))}~${maxW} x ${maxH}`);
    console.log(`🖼  正規化成 ${maxW}x${maxH}（內容靠左、右側補透明）…`);

    let png = 0, webp = 0;
    for (const r of raw) {
        const out = await sharp(r.buf)
            .extend({
                top: 0, left: 0,
                bottom: maxH - r.h,
                right: maxW - r.w,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .webp({ quality: 90 })
            .toBuffer();
        fs.writeFileSync(path.join(OUT_DIR, `${r.lv}.webp`), out);
        png += r.buf.length;
        webp += out.length;
    }

    console.log(`✅ 完成　png ${(png / 1024).toFixed(0)}KB → webp ${(webp / 1024).toFixed(0)}KB`);
}

main().catch(err => { console.error('❌ 失敗:', err.message); process.exit(1); });
