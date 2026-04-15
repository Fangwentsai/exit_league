/**
 * =====================================================
 * Google Apps Script — 週報自動化寫入功能
 * =====================================================
 *
 * 📌 使用說明：
 * 1. 打開你的 Google Apps Script 專案
 *    （附加到試算表 1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM）
 * 2. 將此檔案的內容「貼上」或「加入」到你現有的 GAS 專案中
 *    （不要覆蓋原有的 doPost 和 uploadFileToGitHub 函數，要合併）
 * 3. 儲存後，點選 部署 → 管理部署 → 點鉛筆圖示 → 版本選「新版本」→ 部署
 * 4. 確認部署 URL 與 config.json 中的 gasWebAppUrl 相同
 *
 * =====================================================
 * 注意：這是「附加到既有 GAS 專案」的程式碼片段
 * 請將下面的 handleWeeklyUpdate() 和輔助函數加入你的 Code.gs
 * 並在 doPost() 中加入對 weeklyUpdate action 的處理
 * =====================================================
 */

// ===================================================
// 將以下 case 加入你的 doPost() 函數中：
// ===================================================
/*
  在 doPost(e) 裡，找到 if (data.action === 'uploadToGitHub') 的判斷
  在後面加入：

  if (data.action === 'weeklyUpdate') {
    return handleWeeklyUpdate(data);
  }
*/

/**
 * 處理每週自動化更新
 * 接收 weekly_update.js 發送的資料，寫入 Google Sheets
 */
function handleWeeklyUpdate(data) {
  try {
    const ss = SpreadsheetApp.openById(data.sheetId);
    let scheduleUpdated = 0;
    let dataAppended = 0;

    // ===== 1. 更新 schedule 頁籤 =====
    // 找到對應 gId 的列，填入分數和勝負
    if (data.matchRows && data.matchRows.length > 0) {
      scheduleUpdated = updateScheduleSheet(ss, data.matchRows);
    }

    // ===== 2. 追加到 data 頁籤 =====
    // 在最後一列後面，追加本週選手數據
    if (data.playerRows && data.playerRows.length > 0) {
      dataAppended = appendToDataSheet(ss, data.playerRows);
    }

    // ===== 3. 更新 personal 頁籤的勝場統計 =====
    // （可選：重新計算累積總勝場，目前先跳過，改由讀取現有數據）

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        scheduleUpdated: scheduleUpdated,
        dataAppended: dataAppended,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('handleWeeklyUpdate 錯誤: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 更新 schedule 頁籤
 * 根據 gId 找到對應的列，填入 客場分數(D)、主場分數(F)、勝(I)、敗(J)
 * 同時補 酒(K)、和局(L) 欄（如果存在）
 *
 * schedule 欄位：
 * A=遊戲編號, B=日期, C=客場, D=客場分數, E=vs, F=主場分數, G=主場,
 * H=比賽地點, I=勝, J=敗, K=酒(選填), L=和局(選填)
 */
function updateScheduleSheet(ss, matchRows) {
  const sheet = ss.getSheetByName('schedule');
  if (!sheet) {
    Logger.log('找不到 schedule 頁籤');
    return 0;
  }

  const lastRow = sheet.getLastRow();
  // 讀取整個 schedule 資料（從第 2 列開始，A 欄是 gId）
  const allData = sheet.getRange(2, 1, lastRow - 1, 12).getValues();

  let updatedCount = 0;

  matchRows.forEach(match => {
    // 找到對應的 gId 列（A 欄，不分大小寫）
    let targetRowIndex = -1;
    for (let i = 0; i < allData.length; i++) {
      const cellGId = String(allData[i][0]).trim().toUpperCase();
      if (cellGId === match.gId.toUpperCase()) {
        targetRowIndex = i + 2; // +2 因為從第 2 列開始，且 getRange 是 1-indexed
        break;
      }
    }

    if (targetRowIndex === -1) {
      // 如果找不到對應 gId，記錄一下但跳過
      Logger.log(`找不到 ${match.gId} 的列，跳過`);
      return;
    }

    // 更新 D欄(客場分數)、F欄(主場分數)、I欄(勝)、J欄(敗)
    sheet.getRange(targetRowIndex, 4).setValue(match.awayScore);  // D = 客場分數
    sheet.getRange(targetRowIndex, 6).setValue(match.homeScore);  // F = 主場分數
    sheet.getRange(targetRowIndex, 9).setValue(match.winner);     // I = 勝
    sheet.getRange(targetRowIndex, 10).setValue(match.loser);     // J = 敗

    // 補地點（H欄），有些可能是空的
    if (match.venue) {
      sheet.getRange(targetRowIndex, 8).setValue(match.venue);
    }

    // 補酒（K欄）、和局（L欄）— 如果 sheet 有這幾欄的話
    const maxCols = sheet.getLastColumn();
    if (maxCols >= 11) {
      sheet.getRange(targetRowIndex, 11).setValue(match.drunk || ''); // K = 酒
    }
    if (maxCols >= 12) {
      sheet.getRange(targetRowIndex, 12).setValue(match.draw || ''); // L = 和局
    }

    Logger.log(`✅ 更新 ${match.gId}: ${match.awayTeam} ${match.awayScore}:${match.homeScore} ${match.homeTeam}`);
    updatedCount++;
  });

  return updatedCount;
}

/**
 * 追加選手數據到 data 頁籤最後面
 *
 * data 頁籤格式（每週賽事是一個 block）：
 * [date_header]  → A欄填日期，B~H空白
 * [team_header]  → A=選手, B~H=欄位標題（可選，也可省略）
 * [player]       → A=選手名, B=01出賽, C=01勝場, D=CR出賽, E=CR勝場, F=合計出賽, G=合計勝場, H=先攻數
 *
 * 注意：playerRows 包含 type: date_header / team_header / player
 */
function appendToDataSheet(ss, playerRows) {
  const sheet = ss.getSheetByName('data');
  if (!sheet) {
    Logger.log('找不到 data 頁籤');
    return 0;
  }

  // 找到真正的最後一列（有資料的那列）
  const lastRow = sheet.getLastRow();

  // 準備要寫入的資料列
  const rowsToAppend = [];

  let currentDate = '';
  let currentTeam = '';

  playerRows.forEach(row => {
    if (row.type === 'date_header') {
      // 日期 header — 只在日期改變時加入
      if (row.date !== currentDate) {
        rowsToAppend.push([row.date, '', '', '', '', '', '', '']);
        currentDate = row.date;
      }
    } else if (row.type === 'team_header') {
      // 隊伍 header — 加入欄位標題列
      currentTeam = row.team;
      rowsToAppend.push([`【${row.team}】選手`, '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數']);
    } else if (row.type === 'player') {
      // 選手資料列
      rowsToAppend.push([
        row.name,
        row.p01, row.w01,
        row.pCR, row.wCR,
        row.total, row.wins,
        row.fa
      ]);
    }
  });

  if (rowsToAppend.length === 0) return 0;

  // 空一列再加入（與前一週資料分隔）
  if (lastRow >= 1) {
    const separator = ['', '', '', '', '', '', '', ''];
    rowsToAppend.unshift(separator);
  }

  // 批次寫入，從 lastRow + 1 開始
  const startRow = lastRow + 1;
  sheet.getRange(startRow, 1, rowsToAppend.length, 8).setValues(rowsToAppend);

  Logger.log(`✅ data 頁籤：已追加 ${rowsToAppend.length} 列（從第 ${startRow} 列）`);
  return rowsToAppend.length;
}

// =====================================================
// 完整的 doPost 函數（請用此版本取代原有的 doPost）
// 或手動把 weeklyUpdate 的 case 合併進去
// =====================================================
/*
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ===== 週報自動化寫入 =====
    if (data.action === 'weeklyUpdate') {
      return handleWeeklyUpdate(data);
    }

    // ===== GitHub 上傳 =====
    if (data.action === 'uploadToGitHub') {
      return handleGitHubUploadRequest(data);
    }

    // ===== 原有的 Google Sheets 保存邏輯 =====
    const result = saveToGoogleSheets(data);
    // ... 原有程式碼 ...

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
*/

/**
 * 測試函數：用假資料測試 handleWeeklyUpdate
 * 在 GAS 編輯器中直接執行此函數可以驗證
 */
function testWeeklyUpdate() {
  const testData = {
    sheetId: '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM',
    matchRows: [
      {
        gId: 'G61',
        date: '4/14',
        awayTeam: '測試客隊',
        awayScore: 15,
        homeScore: 20,
        homeTeam: '測試主隊',
        venue: '測試場地',
        winner: '測試主隊',
        loser: '測試客隊',
        drunk: '',
        draw: ''
      }
    ],
    playerRows: [
      { type: 'date_header', date: '4/14' },
      { type: 'team_header', team: '測試客隊' },
      { type: 'player', name: '測試選手A', team: '測試客隊', p01: 2, w01: 1, pCR: 3, wCR: 2, total: 5, wins: 3, fa: 2 }
    ]
  };

  // 注意：這會真的寫入試算表，確認後再執行
  // const result = handleWeeklyUpdate({ ...testData, action: 'weeklyUpdate' });
  Logger.log('測試資料準備完成，如要執行請取消上面那行的註解');
}
