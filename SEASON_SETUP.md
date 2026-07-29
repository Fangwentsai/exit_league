# 新增一屆聯賽 — 操作手冊

> 版本：2026/07 | 適用：第七屆起（賽季註冊表改版後）

---

## 核心概念：賽季註冊表

所有賽季設定集中在 **`config/config.js`** 的 `SEASONS` 一張表。全站的賽程頁、排名頁、新聞頁都從這張表查資料，不再各自寫死季號。

```js
const SEASONS = {
    7: {
        sheetId: '1APUuzy...',        // Google 試算表 ID
        apiKey: DEFAULT_API_KEY,
        label: '第七屆',
        year: 2027,                    // 試算表只填 "1/28" 時要補的年份
        rankRange: 'O:V',              // 排行榜欄位範圍
        schedulePage: 'scheduleS7',    // 對應 pages/scheduleS7.html
        rankPage: 'rankS7',            // 對應 pages/rankS7.html
        resultDir: 'season7'           // 對應 game_result/season7/
    },
    // ...
};

const CURRENT_SEASON = 7;   // 當季：news 頁與 sitemap 優先級看這個
```

### 欄位說明

| 欄位 | 說明 |
|------|------|
| `year` | 試算表日期欄只填「M/D」時要補上的年份。填 `null` 代表不補（第三屆就是這樣） |
| `rankRange` | 排行榜在 schedule 工作表的欄位範圍。**新制 `O:V`**（O 排名、P 隊名、Q 勝、R 敗、S 和、T 積分、U 飲酒加成、V 總分）；第三、四屆的舊制是 `K:Q`（無排名欄） |
| `resultDir` | 賽果 HTML 的資料夾名，要與 `game_result/` 底下的實際資料夾一致 |

---

## 開新一屆的步驟

### Step 1：準備 Google 試算表

**複製上一屆的試算表**當範本，確保欄位結構一致（`schedule`、`personal`、`data` 三個必要頁籤）。

然後做兩件事：

1. **清空上一屆的資料**。複製過來的表會留著上一屆的完整賽程與成績，不清掉的話新一屆的頁面會顯示上一季的比賽。
2. **開放讀取權限**：共用 → 一般存取權 → 「知道連結的任何人」+「檢視者」。沒開的話網站會拿到 403，賽程和排名頁會是空的。

> 💡 驗證權限是否正確：把下面網址的 `SHEET_ID` 換掉，用瀏覽器打開，看得到 JSON 就對了。
> `https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/schedule!A1:B2?key=AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4`

### Step 2：註冊新賽季

編輯 `config/config.js`：

1. 在 `SEASONS` 加一筆（照上一屆的格式，改 `sheetId`、`label`、`year`、頁面名稱、`resultDir`）
2. 把 `CURRENT_SEASON` 改成新的屆數

### Step 3：複製兩個頁面範本

```bash
cd pages
sed -e 's/第六季/第七季/g; s/第六屆/第七屆/g; s/scheduleS6/scheduleS7/g; s/rankS6/rankS7/g; s/= '"'"'s6'"'"'/= '"'"'s7'"'"'/g' scheduleS6.html > scheduleS7.html
sed -e 's/第六季/第七季/g; s/第六屆/第七屆/g; s/scheduleS6/scheduleS7/g; s/rankS6/rankS7/g; s/= '"'"'s6'"'"'/= '"'"'s7'"'"'/g' rankS6.html > rankS7.html
```

複製後**務必手動確認**：`const seasonOverride = 's7';`、`<title>`、`canonical`、`og:url` 都指向新一屆。

### Step 4：建立賽果資料夾

```bash
mkdir -p game_result/season7 && touch game_result/season7/.gitkeep
```

### Step 5：側邊欄加入口

編輯 `index.html`，在**賽程**和**排名**兩個子選單各加一列，放在最上面：

```html
<div class="sidebar-btn submenu-item" data-page="scheduleS7">第七屆</div>
<div class="sidebar-btn submenu-item" data-page="rankS7">第七屆</div>
```

### Step 6：更新隊伍名單

`pages/scheduleS7.html` 的快速篩選按鈕是寫死的隊名（檔案裡有 `TODO(第七屆)` 註解標示位置）。

> ⚠️ 隊名必須與 Google Sheets `schedule` 頁籤裡的寫法**完全一致**（含大小寫與全形半形），否則篩選會失效。

同時更新 `data/player.json` 的各隊選手名單。

### Step 7：重新產生 sitemap

```bash
node scripts/generate_sitemap.js
```

腳本會自動從註冊表和實際檔案產生，新一屆的頁面與所有賽果頁都會被收錄。**每次新增一批賽果 HTML 後也要重跑**。

### Step 8：更新每週自動化

`scripts/weekly_update.js` 頂端的 `CONFIG` 還是獨立寫死的，需要手動改：

```js
const CONFIG = {
  season: 7,
  sheetId: '新的試算表 ID',
  gasWebAppUrl: '...',                       // 換新試算表要重新綁定 GAS
  gameResultDir: path.join(__dirname, '../game_result/season7'),
};
```

> ⚠️ 換了試算表就要**重新部署 GAS Web App** 並確認 URL，否則每週腳本會把資料寫到舊表去。做法見 `WEEKLY_WORKFLOW.md`。

### Step 9：更新首頁 meta

`index.html` 的 `<title>`、`description`、`og:description`、`twitter:description` 都有季號文字，一併換掉。

### Step 10：更新快取版本號

`index.html` 裡 `config/config.js?v=` 和 `js/main.js?v=` 的版本號要往上加，否則使用者會拿到舊的快取而看不到新一屆。

---

## 上一屆要做的事（收起來）

賽季註冊表的設計是**歷史賽季全部保留**，不需要刪任何東西：

- 頁面、賽果 HTML、照片全部留著，選單往下移一格即可
- `CURRENT_SEASON` 一改，news 頁就自動指向新一屆
- sitemap 重新產生後，舊賽季的優先級會自動從 `0.9` 降到 `0.6`

需要手動處理的只有：

- `index.html` 的季後賽 / 頒獎 modal iframe（`pages/sN_playoffs.html`）要指向新的或先隱藏
- 頒獎典禮照片：放進 `images/award/seasonN/`，並在 `js/main.js` 的 `knownFiles` 與輪播清單登記

---

## 踩過的坑

### ⚠️ 不要在別的檔案再宣告一次 `CONFIG`

`config/config.js` 用 `const CONFIG` 宣告在全域。如果另一個檔案也用 `const CONFIG`，而兩者被同一個頁面載入，瀏覽器會拋出 `Identifier 'CONFIG' has already been declared`，**後載入的那支 JS 會整份不執行**。

這個問題實際發生過（詳見 `HEALTH_CHECK.md` 第 8 項），症狀是賽程表完全空白但主控台看不到明顯錯誤，很難察覺。

### ⚠️ 載入順序：config.js 必須在 main.js / rank.js / news.js 之前

這些檔案都依賴 `SEASONS`、`CONFIG`、`CURRENT_SEASON`、`resolveSeasonNumber()`。用 `defer` 的話瀏覽器會依 HTML 出現順序執行，所以 script 標籤的先後就是執行順序：

```html
<script src="config/config.js?v=20260729" defer></script>
<script src="js/main.js?v=20260729" defer></script>
```

新增任何載入 `main.js` / `rank.js` / `news.js` 的頁面時，都要記得先載入 `config/config.js`。

### ⚠️ 第五屆的 API key 有網域限制

第五屆用的是 `AIzaSyDtba...`，設了 HTTP referrer 限制只允許 `yhdarts.com`。**在 localhost 測試時第五屆會拿到 403**，這是正常的，不是程式壞了。其他屆用的 `AIzaSyC-FZ...` 沒有限制（這點反而該收緊，見 `HEALTH_CHECK.md` 第 2 項）。

---

## 驗證清單

開完新一屆後，依序確認：

- [ ] 新一屆賽程頁有資料（側邊欄進入 + 直接開 `pages/scheduleS7.html` 都要測）
- [ ] 新一屆排名頁有資料，欄位對得上（`rankRange` 設錯會整排錯位）
- [ ] **舊賽季沒有被改壞**：第三、四、六屆的賽程與排名頁筆數與改動前一致
- [ ] news 頁的「上週戰況 / 近期比賽」抓的是新一屆
- [ ] 主控台沒有 `CONFIG has already been declared` 之類的錯誤
- [ ] `sitemap.xml` 含新一屆的 schedule / rank 頁

> 💡 直接開啟頁面（`pages/scheduleS7.html`）和從側邊欄進入（`index.html#scheduleS7`）走的是**不同的載入路徑**，兩種都要測。過去的 bug 就是只有前者壞掉。

---

## 相關檔案

| 檔案 | 用途 |
|------|------|
| `config/config.js` | **賽季註冊表（唯一設定來源）** |
| `js/main.js` | SPA 導覽、賽程表、news 頁資料 |
| `js/rank.js` | 排名頁 |
| `js/news.js` | news 頁比賽列表 |
| `scripts/generate_sitemap.js` | 產生 sitemap |
| `scripts/weekly_update.js` | 每週自動化（季號仍需手動改） |
| `WEEKLY_WORKFLOW.md` | 每週例行操作手冊 |
| `HEALTH_CHECK.md` | 網站健檢與待辦 |
