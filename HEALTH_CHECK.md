# yhdarts.com 網站健檢報告

日期:2026-07-07

## 🔴 嚴重(建議立即處理)

### 1. Admin 密碼明碼寫在前端 JS
`js/admin-main.js:120` 寫死 `username === 'root' && password === 'root666'`。這個 repo 是公開的(github.com/Fangwentsai/exit_league),網站 JS 也人人可讀,等於後台完全沒有保護。`pages/test-admin-save.html` 也被 git 追蹤並公開。

建議:前端登入驗證無法保護任何東西。把 admin 寫入功能移到 Vercel API route(如同 `api/shopee-products.js` 的做法),用環境變數存密碼,或至少改用 Vercel 的密碼保護/移除公開 admin 頁。

### 2. Google API Key 寫死且散落各處
`AIzaSyC-FZ...` 與 `AIzaSyDtba...` 出現在 8 個檔案(config/config.js、js/main.js、js/admin-sheets-api.js、js/match-preview.js、pages/news.html、scripts/weekly_update.js)。Sheets 瀏覽器端 key 公開本身可接受,但必須確認:

- Google Cloud Console 已設定 HTTP referrer 限制(只允許 yhdarts.com)
- key 只啟用 Sheets API 讀取

另外 `.gitnore`(拼錯,應為 `.gitignore`)原意是要忽略 `config/config.js`,實際完全沒生效。

## 🟡 中等

### 3. sitemap.xml 缺第六季內容
206 個 URL 中完全沒有 S6 頁面(rankS6、scheduleS6、s6_playoffs、season6 賽果),lastmod 全部停在 2025-12-09。第六季進行中卻沒被搜尋引擎索引到。

### 4. 多數頁面缺 SEO 標籤
index.html、news.html、rankS6.html 有 canonical/og,但 rank.html、schedule.html、shops.html 等都沒有。結構化資料(ld+json)只有首頁有。

### 5. HSTS meta 標籤無效
`<meta http-equiv="Strict-Transport-Security">` 瀏覽器會忽略,HSTS 只能透過 HTTP header 設定。可在 `vercel.json` 加 `headers` 設定(順便加 X-Content-Type-Options、X-Frame-Options)。

### 6. 圖片未優化(共 16MB)
- `images/award/` 13MB,單張 JPG 高達 1.3MB
- `images/season5.png` 632KB,但已有 65KB 的 season5.webp 可用
- 建議批次轉 webp + 縮圖,得獎照片壓到 200KB 以下

## 🟢 輕微(整理性質)

### 7. Git 追蹤了不該追蹤的檔案
- 多個 `.DS_Store`(雖在 .gitignore 但先前已被追蹤,需 `git rm --cached`)
- 根目錄雜物:`g43_g48_stats.csv`、`item_0329.csv`、`gas_complete_updated.js`、`google-apps-script-*.js`、`weekly_*.csv`
- 建議移到 `scripts/` 或 `data/`,一次性檔案直接刪除

### 8. 設定重複
同一組 SHEET_ID/API_KEY 在 config.js 和 main.js 各寫一份,改季號要改多處。建議統一由 config/config.js 提供。

## ✅ 做得好的地方

- `.env.local` 有正確被 .gitignore 忽略,Shopee 密鑰未外洩
- `api/shopee-products.js` 走後端 API route,簽名在伺服器端算,是正確做法
- `js/github-api.js` 有註明 token 不應存前端
- robots.txt 與 canonical(首頁)設定正確

## 附註

線上網站抓取工具當下逾時,未能驗證 yhdarts.com 即時狀態,以上皆基於本機檔案分析。
