#!/usr/bin/env node
// 把季後賽賽制圖的 HTML 原始檔算成首頁輪播用的 webp。
//
// 原始檔是 pages/s7_playoffs_banner.html（純 HTML + SVG，1600x800），
// 改完裡面的隊名／名次之後跑這支，就會重新產生 images/s7_playoffs.webp。
//
// 流程：Chrome headless 以 2 倍解析度截圖 → cwebp 縮回 1600x800 並壓成 webp。
// 用 2 倍再縮是為了讓中文字邊緣乾淨，直接用 1 倍截圖字會糊。
//
//   node scripts/render_playoffs.js                    # 用預設值
//   node scripts/render_playoffs.js --quality 92       # 調畫質
//   node scripts/render_playoffs.js --src pages/x.html --out images/x.webp
//   CHROME=/path/to/chrome node scripts/render_playoffs.js
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULTS = {
    src: 'pages/s7_playoffs_banner.html',
    out: 'images/s7_playoffs.webp',
    width: 1600, height: 800, scale: 2, quality: 88,
};

function parseArgs(argv) {
    const o = Object.assign({}, DEFAULTS);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const k = a.slice(2);
        if (k === 'keep-png') { o.keepPng = true; continue; }
        if (!(k in o)) { console.error('不認得的參數：' + a); process.exit(1); }
        const v = argv[++i];
        o[k] = typeof DEFAULTS[k] === 'number' ? Number(v) : v;
    }
    return o;
}

function usable(p) {
    try { fs.accessSync(p, fs.constants.X_OK); return true; } catch (e) { return false; }
}

function findChrome() {
    // 環境變數也要檢查，不然打錯路徑會一路跑到截圖才爆掉
    if (process.env.CHROME) {
        if (usable(process.env.CHROME)) return process.env.CHROME;
        console.error('CHROME 指定的路徑不存在或不可執行：' + process.env.CHROME);
        process.exit(1);
    }
    const candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    ];
    const hit = candidates.find(usable);
    if (!hit) {
        console.error('找不到 Chrome。試過：\n  ' + candidates.join('\n  ') +
                      '\n可以用 CHROME=/path/to/chrome 指定。');
        process.exit(1);
    }
    return hit;
}

function need(cmd, hint) {
    try { execFileSync('which', [cmd], { stdio: 'pipe' }); }
    catch (e) { console.error('找不到 ' + cmd + '。' + hint); process.exit(1); }
}

const o = parseArgs(process.argv.slice(2));
if (!fs.existsSync(o.src)) { console.error('原始檔不存在：' + o.src); process.exit(1); }
need('cwebp', 'macOS 可用 brew install webp 安裝。');
const chrome = findChrome();

const png = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'playoffs-')), 'shot.png');
const before = fs.existsSync(o.out) ? fs.statSync(o.out).size : 0;

console.log('原始檔  ' + o.src);
console.log('瀏覽器  ' + chrome);
console.log('渲染中  ' + (o.width * o.scale) + 'x' + (o.height * o.scale) + '（' + o.scale + ' 倍）…');
execFileSync(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=' + o.scale,
    '--window-size=' + o.width + ',' + o.height,
    '--screenshot=' + png,
    'file://' + path.resolve(o.src),
], { stdio: 'pipe' });
if (!fs.existsSync(png)) { console.error('截圖失敗，沒有產生檔案'); process.exit(1); }

console.log('轉檔中  縮回 ' + o.width + 'x' + o.height + '，quality ' + o.quality + '…');
execFileSync('cwebp', ['-quiet', '-q', String(o.quality),
    '-resize', String(o.width), String(o.height), png, '-o', o.out], { stdio: 'pipe' });

const after = fs.statSync(o.out).size;
console.log('完成    ' + o.out + '  ' + after + ' bytes' +
            (before ? '（原本 ' + before + '，' + (after >= before ? '+' : '') + (after - before) + '）' : ''));
if (o.keepPng) console.log('中繼 PNG ' + png);
else fs.rmSync(path.dirname(png), { recursive: true, force: true });
