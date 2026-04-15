# 難找的聯賽 — 每週操作手冊

> 版本：2026/04 | 適用：第六屆起

---

## 一覽：每週需要做什麼

| # | 工作項目 | 誰來做 | 耗時 |
|---|---------|-------|------|
| 1 | 賽後填寫比賽戰報 HTML | **人工** | 15~30 分鐘 |
| 2 | push 戰報到 GitHub | **人工** | 1 分鐘 |
| 3 | 執行自動化腳本（更新排行榜 + Google Sheets + push） | **一行指令** | 1 分鐘 |

---

## 專案結構

```
exit_league/
├── game_result/
│   └── season6/
│       ├── g01.html ~ g60.html   ← 歷史戰報
│       └── g61.html ...          ← 每週新增
├── pages/
│   └── news.html                 ← 聯賽新聞頁（自動更新）
├── scripts/
│   ├── weekly_update.sh          ← 主控腳本入口（每週執行這個）
│   ├── weekly_update.js          ← Node.js 主邏輯
│   ├── gas_weekly_update.js      ← 要貼進 GAS 的程式碼
│   ├── weekly_matches.csv        ← 本週賽果備份（自動生成）
│   └── weekly_players.csv        ← 本週選手數據備份（自動生成）
└── WEEKLY_WORKFLOW.md            ← 本文件
```

---

## Step 1：賽後填寫比賽戰報 HTML（人工）

每週賽事結束後，為每場比賽建立一個新的 HTML 戰報檔案。

### 1-1 複製上一週的戰報當模板

```bash
cp game_result/season6/g60.html game_result/season6/g61.html
```

### 1-2 修改以下欄位

打開 `g61.html`，修改：

```html
<!-- 1. 頁面標題和 meta -->
<title>難找的聯賽 第六屆 G61 賽果：XXX vs. OOO｜飛鏢聯賽戰報</title>

<!-- 2. 比賽日期 -->
<h2 class="match-date">4/14</h2>

<!-- 3. 場地 -->
<div class="venue-info">No.5 飛鏢Bar</div>

<!-- 4. 客隊名 -->
<div class="team away"><div class="team-name">客隊名稱</div>...

<!-- 5. 主隊名 -->
<div class="team home">...<div class="team-name">主隊名稱</div>

<!-- 6. 每一局的比賽資料（JS 區塊）-->
const g61Matches = [
    { set: 1, type: '01', away: '選手A', home: '選手B', firstAttack: 'away', winner: 'home' },
    ...
];

<!-- 7. 飲酒加成 -->
const drinkingBonus = { away: 0, home: 0 };

<!-- 8. 選手名單 -->
const awayPlayers = ['選手A', '選手C', ...];
const homePlayers = ['選手B', '選手D', ...];

<!-- 9. 初始化函數名稱改成 g61Matches -->
addMatchData(g61Matches);
const scores = calculateFinalScore(g61Matches, drinkingBonus);
```

### 1-3 計分規則

| set 編號 | 類型 | 得分 |
|---------|------|------|
| 1~4 | 01 個人賽 | 各 1 分 |
| 5 | 01 三人賽 | 3 分 |
| 6~9 | CR 個人賽 | 各 1 分 |
| 10 | CR 三人賽 | 3 分 |
| 11~14 | 雙人賽 | 各 2 分 |
| 15 | 四人賽 01 | 4 分 |
| 16 | 四人賽 CR | 4 分 |
| — | 大局勝加成 | 1 分（比賽成績高者加） |
| — | 飲酒加成 | 自訂（drinkingBonus） |

### 1-4 Push 到 GitHub

```bash
cd /Users/jessetsai_mba/Cursor/exit_league
git add game_result/season6/
git commit -m "Add G61~G66 game results"
git push
```

---

## Step 2：執行自動化腳本（一行指令）

> ⚠️ 必須先完成所有戰報 HTML 並 push 後再執行

```bash
cd /Users/jessetsai_mba/Cursor/exit_league
bash scripts/weekly_update.sh 61 66
```

### 腳本執行順序

```
1. git pull origin main          ← 確保本機有最新 HTML
2. 解析 g61.html ~ g66.html      ← 計算分數、選手數據
3. 輸出 CSV 備份                  ← weekly_matches.csv / weekly_players.csv
4. POST 到 GAS Web App
   ├── 寫入 schedule 頁籤 D/F/I/J 欄（客場分、主場分、勝、敗）
   └── 追加到 data 頁籤底部（本週選手明細）
5. 讀取 Google Sheets 排行榜
   ├── 團隊排行：schedule!X2:Z13（公式自動計算）
   ├── 個人勝場：personal!T2:V6
   ├── Top Lady：personal!A:N 篩 N=女，G欄排序
   └── 地獄倒霉鬼：personal!W2:Y6
6. 更新 pages/news.html          ← 排行榜 + 本週新聞草稿
7. git add . && git commit && git push
```

### 常用選項

```bash
# 只計算，不寫入 Google Sheets（測試用）
bash scripts/weekly_update.sh 61 66 --dry-run

# 寫入 Sheets 但不自動 push
bash scripts/weekly_update.sh 61 66 --no-push
```

---

## Step 3：確認 news.html（選填：潤稿）

腳本會自動在 `news.html` 最上方插入新聞草稿，格式如下：

- 本週賽事結果列表
- 當前排行榜第一名隊伍
- 個人勝場王

如需更豐富的新聞內容（帶梗、口語化），可以在 AI 幫你更新 news.html 之後，手動潤稿。

---

## Google Sheets 對照表

**試算表 ID：** `1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM`

### schedule 頁籤

| 欄位 | 內容 | 填寫方式 |
|------|------|---------|
| A | 遊戲編號（G61...） | 預填 |
| B | 日期 | 預填 |
| C | 客場隊名 | 預填 |
| **D** | 客場分數 | **腳本自動填入** |
| E | vs | 預填 |
| **F** | 主場分數 | **腳本自動填入** |
| G | 主場隊名 | 預填 |
| H | 比賽地點 | **腳本自動填入** |
| **I** | 勝 | **腳本自動填入** |
| **J** | 敗 | **腳本自動填入** |
| X~Z | 團隊總分排行 | 公式自動計算 |

> ⚠️ **G61~G66 的 A/B/C/G 欄（編號、日期、隊名）必須在賽前預先填好**，腳本只填入 D/F/H/I/J。

### personal 頁籤

| 欄位 | 內容 | 用途 |
|------|------|------|
| A | 隊伍 | 個人排行來源 |
| B | 姓名 | 個人排行來源 |
| G | 總勝場 | 個人勝場排行、Top Lady 排序依據 |
| I | 先攻率 | 不使用（改用 W:Y 的預算結果） |
| N | 性別（男/女） | Top Lady 篩選用 |
| T2:V6 | 個人勝場 Top 5 | 腳本直接讀取 |
| T9:V13 | Top Lady（預算，不使用） | 腳本改用 N 欄動態算 |
| W2:Y6 | 地獄倒霉鬼 Top 5 | 腳本直接讀取 |

### data 頁籤

每週選手出賽明細，格式如下（腳本自動追加到底部）：

```
[日期]
[隊名] 選手  01出賽  01勝場  CR出賽  CR勝場  合計出賽  合計勝場  先攻數
選手A         2       1       3       2       5        3        2
...
```

---

## GAS Web App 設定（一次性）

**GAS Web App URL：**
```
https://script.google.com/macros/s/AKfycbwJ3xPlfON7pkmeVKzpQImQhnlzpMz6Fn4Z1E7PwXVBZBvlncA7VCQ3tITyq9x8puAu/exec
```

### 目前的 GAS Code.gs 結構

```javascript
function doGet(e) { ... }   // 測試連線用

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // ← 加在這裡（在原有邏輯之前）：
  if (data.action === 'weeklyUpdate') {
    return handleWeeklyUpdate(data);
  }

  // 原有的 cell/value 邏輯...
}

// ← 貼在最下面（來自 scripts/gas_weekly_update.js）：
function handleWeeklyUpdate(data) { ... }
function updateScheduleSheet(ss, matchRows) { ... }
function appendToDataSheet(ss, playerRows) { ... }
```

### 如果需要重新部署 GAS

1. 打開 https://script.google.com
2. 找到對應的專案（附加到試算表的那個）
3. 部署 → 管理部署 → 鉛筆 → 版本選「**新版本**」→ 部署
4. 確認 URL 與 `scripts/weekly_update.js` 的 `gasWebAppUrl` 相同

---

## 欄位計算邏輯（給 AI 快速理解用）

### 積分計算（腳本做的）

```
客場積分 = Σ(各 set 得分) + 大局勝加成(1) + drinkingBonus.away
主場積分 = Σ(各 set 得分) + 大局勝加成(1) + drinkingBonus.home

大局勝加成：比賽成績（不含飲酒）較高方 +1
勝負判定：依比賽成績（不含飲酒加成）
```

### SET_POINTS 對照

```javascript
const SET_POINTS = [0, 1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4];
//                 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
```

---

## 常見問題

**Q：腳本執行後 schedule 沒有更新？**
A：確認 GAS Web App 已重新部署（選新版本），且 `gasWebAppUrl` 是最新的 URL。

**Q：排行榜數字不對？**
A：先確認 schedule 的 D/F 欄分數已正確寫入，X:Z 欄的公式會自動重算。

**Q：Top Lady 沒有出現？**
A：確認 personal 頁籤的 N 欄有填「女」（注意是全形中文）。

**Q：場次編號怎麼決定？**
A：每週順序加 6 場。例如上週是 G55~G60，下週就是 G61~G66。

**Q：新聞稿要怎麼補充？**
A：腳本生成的是基本草稿，可以告訴 AI「幫我根據本週數據重新寫一篇新聞稿」，AI 會根據 news.html 的現有資料補充內容。
