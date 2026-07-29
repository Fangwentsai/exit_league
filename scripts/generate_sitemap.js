#!/usr/bin/env node
/**
 * generate_sitemap.js — 依賽季註冊表與實際檔案產生 sitemap.xml
 *
 * 使用方式：
 *   node scripts/generate_sitemap.js
 *
 * 賽季資料直接沿用 config/config.js，所以新增一屆之後只要重跑本腳本，
 * 新的賽程頁、排名頁與所有賽果頁都會自動被收錄。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_URL = 'https://yhdarts.com';

// 直接讀取 config/config.js 取得 SEASONS 與 CURRENT_SEASON
const configSrc = fs.readFileSync(path.join(ROOT, 'config/config.js'), 'utf8');
const sandbox = { console: { log() {} } };
new Function('globalThis', `${configSrc}\nglobalThis.SEASONS = SEASONS; globalThis.CURRENT_SEASON = CURRENT_SEASON;`)(sandbox);
const { SEASONS, CURRENT_SEASON } = sandbox;

const today = new Date().toISOString().slice(0, 10);
const urls = [];

const add = (loc, priority, changefreq) => {
    urls.push({ loc, priority, changefreq });
};

// 首頁與公告
add('/', '1.0', 'weekly');
add('/pages/news.html', '0.9', 'weekly');

// 各屆賽程與排名：當季優先級最高
const seasonNums = Object.keys(SEASONS).map(Number).sort((a, b) => b - a);
seasonNums.forEach(num => {
    const s = SEASONS[num];
    const isCurrent = num === CURRENT_SEASON;
    const priority = isCurrent ? '0.9' : '0.6';
    const freq = isCurrent ? 'weekly' : 'monthly';
    add(`/pages/${s.schedulePage}.html`, priority, freq);
    add(`/pages/${s.rankPage}.html`, priority, freq);
});

// 靜態內容頁
['rule', 'shops', 'awards', 'darts-guide', 'about', 'about-en',
 'privacy', 'privacy-en', 'terms', 'terms-en'].forEach(name => {
    if (fs.existsSync(path.join(ROOT, 'pages', `${name}.html`))) {
        add(`/pages/${name}.html`, '0.7', 'monthly');
    }
});

// 各屆賽果頁：掃描實際存在的 gNN.html
seasonNums.forEach(num => {
    const s = SEASONS[num];
    const dir = path.join(ROOT, 'game_result', s.resultDir);
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir)
        .filter(f => /^g\d+\.html$/.test(f))   // 只收 gNN.html，排除 test.html 之類
        .sort();

    files.forEach(f => {
        add(`/game_result/${s.resultDir}/${f}`, num === CURRENT_SEASON ? '0.6' : '0.4', 'monthly');
    });

    console.log(`  第${num}屆：${files.length} 個賽果頁`);
});

const body = urls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- 由 scripts/generate_sitemap.js 自動產生，請勿手動編輯 -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`\n✅ sitemap.xml 已產生，共 ${urls.length} 筆網址（當季為第 ${CURRENT_SEASON} 屆）`);
