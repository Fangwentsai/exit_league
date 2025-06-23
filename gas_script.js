function doPost(e) {
  try {
    // 解析請求資料
    const gameData = JSON.parse(e.postData.contents);
    
    // 設定你的 Google Sheets ID
    const SHEET_ID = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE';
    const SHEET_NAME = 'game_results'; // 或你想要的工作表名稱
    
    // 開啟 Google Sheets
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // 如果工作表不存在，則創建
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // 創建標題行
      sheet.getRange(1, 1, 1, 20).setValues([[
        '比賽ID', '時間戳記', '主場隊伍', '客場隊伍', '主場成績', '客場成績', 
        '主場勝場加成', '客場勝場加成', '主場飲酒加成', '客場飲酒加成',
        '主場總分', '客場總分', '飲酒加成隊伍', '選手資料', '先攻資料', 
        '勝負資料', '保存時間', '主場隊名', '客場隊名', '比賽結果'
      ]]);
    }
    
    // 創建包含飲酒加成資訊的勝負資料
    const winLoseDataWithDrinkingBonus = {
      winLoseData: gameData.winLoseData,
      drinkingBonusTeam: gameData.bonusTeam || '',
      homeDrinkBonus: gameData.scores.home.drinkBonus || 0,
      awayDrinkBonus: gameData.scores.away.drinkBonus || 0,
      hasDrinkingBonus: !!(gameData.scores.home.drinkBonus || gameData.scores.away.drinkBonus)
    };
    
    // 準備要寫入的資料
    const rowData = [
      gameData.gameId,
      gameData.timestamp,
      gameData.homeTeam,
      gameData.awayTeam,
      gameData.scores.home.original,
      gameData.scores.away.original,
      gameData.scores.home.winBonus,
      gameData.scores.away.winBonus,
      gameData.scores.home.drinkBonus,
      gameData.scores.away.drinkBonus,
      gameData.scores.home.total,
      gameData.scores.away.total,
      gameData.bonusTeam || '',
      JSON.stringify(gameData.selectedPlayers),
      JSON.stringify(gameData.firstAttackData),
      JSON.stringify(winLoseDataWithDrinkingBonus),
      new Date(),
      gameData.homeTeam,
      gameData.awayTeam,
      `${gameData.homeTeam} ${gameData.scores.home.total} - ${gameData.scores.away.total} ${gameData.awayTeam}`
    ];
    
    // 寫入資料到下一行
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    
    // 返回成功響應
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: '資料已成功保存',
      gameId: gameData.gameId,
      timestamp: new Date()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // 返回錯誤響應
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===============================================================
// ===                 最終單一檔案報表 v9.1                   ===
// ===============================================================

// --- 重要的帳戶與事件設定 ---
const ACCOUNT_ID = '7273';
const APP_TOKENS = 'knkaoebzfnk0';
const PURCHASE_EVENT_TOKEN = 'p39wfk';

// --- 目標試算表設定 ---
const SPREADSHEET_ID = '1Txp9va1izmlauTsHrpCrUOU3SaqIDD2clA935aHI5Nw';
const RAW_DATA_SHEET_NAME = 'Adjust_API';
const SUMMARY_SHEET_NAME = 'Daily Report';

// --- 報表設定 ---
const DIMENSIONS = 'day,country,os_name,app,partner_name,campaign,adgroup,creative';
const METRICS = 'clicks,installs,revenue';

// ===============================================================
// ===                  主程式執行區                           ===
// ===============================================================

/**
 * 主要功能1：從 API 抓取原始數據
 */
function generateRawData() {
  Logger.log('開始執行 [generateRawData] 任務...');
  
  const startDate = new Date('2025-06-19');
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 29);
  const datePeriod = `${formatDateForAPI(startDate)}:${formatDateForAPI(endDate)}`;

  const reportData = fetchSingleReport(datePeriod, METRICS, PURCHASE_EVENT_TOKEN);

  if (reportData) {
    writeDataToSheet(reportData, RAW_DATA_SHEET_NAME);
    Logger.log(`原始數據已成功寫入 ${RAW_DATA_SHEET_NAME} 工作表！`);
  } else {
    Logger.log('API 未回傳任何數據，任務結束。');
  }
}

// ===============================================================
// ===                      輔助函式區                          ===
// ===============================================================

/**
 * 標準化日期字串格式
 * 將各種日期格式統一轉換為 YYYY-MM-DD 格式
 */
function normalizeDateString(dateStr) {
  if (!dateStr) return '';
  
  try {
    // 移除前後空白
    const cleanStr = String(dateStr).trim();
    
    // 如果已經是 YYYY-MM-DD 格式，直接返回
    if (cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return cleanStr;
    }
    
    // 處理各種可能的日期格式
    let date;
    
    // 嘗試直接解析
    if (cleanStr.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
      // 格式: 2025/6/19 或 2025-6-19
      date = new Date(cleanStr);
    } else {
      // 其他格式，嘗試解析
      date = new Date(cleanStr);
    }
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
      Logger.log(`無法解析日期: "${cleanStr}"`);
      return cleanStr; // 返回原始字串
    }
    
    // 轉換為 YYYY-MM-DD 格式
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
    
  } catch (error) {
    Logger.log(`日期標準化錯誤: "${dateStr}" - ${error.message}`);
    return String(dateStr); // 返回原始字串
  }
}

/**
 * 主要功能2：讀取 'Adjust_API' 的數據，並填入 'Daily Report'
 */
function fillSummaryReport() {
  // --- 版面配置設定 ---
  const DATA_START_ROW = 5; // TW 數據的第一列
  const HK_START_ROW = 5;   // HK 數據的第一列
  
  Logger.log('開始執行 [fillSummaryReport] 任務...');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sourceSheet = ss.getSheetByName(RAW_DATA_SHEET_NAME);
  const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);

  if (!sourceSheet || !summarySheet) {
    Logger.log(`錯誤：找不到工作表 ${RAW_DATA_SHEET_NAME} 或 ${SUMMARY_SHEET_NAME}`);
    return;
  }
  
  const sourceData = sourceSheet.getDataRange().getDisplayValues(); 
  const headers = sourceData[0];
  
  const dateIdx = headers.indexOf('day');
  const countryIdx = headers.indexOf('country');
  const osNameIdx = headers.indexOf('os_name');
  const clicksIdx = headers.indexOf('clicks');
  const installsIdx = headers.indexOf('installs');
  const revenueIdx = headers.indexOf('revenue');

  if ([dateIdx, countryIdx, osNameIdx].includes(-1)) {
    Logger.log('錯誤：在 Adjust_API 工作表中找不到 day, country, 或 os_name 欄位。');
    return;
  }

  const dailyAggregatedData = {};

  // 處理原始數據並聚合
  Logger.log('開始處理原始數據...');
  for (let i = 1; i < sourceData.length; i++) {
    const row = sourceData[i];
    const dayKey = row[dateIdx];
    if (!dayKey) continue;

    const countryFullName = row[countryIdx];
    const osName = row[osNameIdx];

    let countryCode = '';
    if (String(countryFullName).includes('Taiwan')) { countryCode = 'TW'; } 
    else if (String(countryFullName).includes('Hong Kong')) { countryCode = 'HK'; } 
    else { continue; }
    
    let platformKey = '';
    if (String(osName).toLowerCase() === 'android') { platformKey = 'Android_' + countryCode; } 
    else if (String(osName).toLowerCase() === 'ios') { platformKey = 'iOS_' + countryCode; } 
    else { continue; }
    
    if (!dailyAggregatedData[dayKey]) { dailyAggregatedData[dayKey] = {}; }
    if (!dailyAggregatedData[dayKey][platformKey]) {
      dailyAggregatedData[dayKey][platformKey] = { clicks: 0, installs: 0, revenue: 0 };
    }
    dailyAggregatedData[dayKey][platformKey].clicks += (parseFloat(row[clicksIdx]) || 0);
    dailyAggregatedData[dayKey][platformKey].installs += (parseFloat(row[installsIdx]) || 0);
    dailyAggregatedData[dayKey][platformKey].revenue += (parseFloat(row[revenueIdx]) || 0);
  }

  Logger.log('聚合後的數據日期:', Object.keys(dailyAggregatedData));

  // 讀取日期範圍
  const summaryDates = summarySheet.getRange('E' + DATA_START_ROW + ':E' + (DATA_START_ROW + 30)).getDisplayValues();
  
  Logger.log(`開始處理 ${summaryDates.length} 個日期，從第 ${DATA_START_ROW} 行開始`);
  
  summaryDates.forEach((row, index) => {
    const dateStringInSheet = row[0];
    if (!dateStringInSheet) return;
    
    Logger.log(`原始日期字串: "${dateStringInSheet}"`);
    
    // 標準化日期格式
    const normalizedSheetDate = normalizeDateString(dateStringInSheet);
    Logger.log(`標準化後的表格日期: "${normalizedSheetDate}"`);
    
    // 在聚合數據中尋找匹配的日期
    let matchedKey = null;
    for (const apiDateKey of Object.keys(dailyAggregatedData)) {
      const normalizedApiDate = normalizeDateString(apiDateKey);
      Logger.log(`比對 API 日期: "${apiDateKey}" -> "${normalizedApiDate}"`);
      
      if (normalizedSheetDate === normalizedApiDate) {
        matchedKey = apiDateKey;
        Logger.log(`✓ 找到匹配: 表格"${normalizedSheetDate}" = API"${normalizedApiDate}"`);
        break;
      }
    }
    
    const rowNum = DATA_START_ROW + index;
    
    if (matchedKey) {
      const dayData = dailyAggregatedData[matchedKey];

      const twAndroidData = dayData['Android_TW'] || { clicks: 0, installs: 0, revenue: 0 };
      const twIosData = dayData['iOS_TW'] || { clicks: 0, installs: 0, revenue: 0 };
      const hkAndroidData = dayData['Android_HK'] || { clicks: 0, installs: 0, revenue: 0 };
      const hkIosData = dayData['iOS_HK'] || { clicks: 0, installs: 0, revenue: 0 };

      // Android-TW: F(點擊), G(安裝), K(購買)
      summarySheet.getRange('F' + rowNum).setValue(twAndroidData.clicks);
      summarySheet.getRange('G' + rowNum).setValue(twAndroidData.installs);
      summarySheet.getRange('K' + rowNum).setValue(twAndroidData.revenue);

      // iOS-TW: P(點擊), Q(安裝), U(購買)
      summarySheet.getRange('P' + rowNum).setValue(twIosData.clicks);
      summarySheet.getRange('Q' + rowNum).setValue(twIosData.installs);
      summarySheet.getRange('U' + rowNum).setValue(twIosData.revenue);
      
      // Android-HK: Z(點擊), AA(安裝), AE(購買)
      summarySheet.getRange('Z' + rowNum).setValue(hkAndroidData.clicks);
      summarySheet.getRange('AA' + rowNum).setValue(hkAndroidData.installs);
      summarySheet.getRange('AE' + rowNum).setValue(hkAndroidData.revenue);

      // iOS-HK: AJ(點擊), AK(安裝), AO(購買)
      summarySheet.getRange('AJ' + rowNum).setValue(hkIosData.clicks);
      summarySheet.getRange('AK' + rowNum).setValue(hkIosData.installs);
      summarySheet.getRange('AO' + rowNum).setValue(hkIosData.revenue);
      
      Logger.log(`✓ 已填入 ${matchedKey} 的數據到第${rowNum}行`);
      Logger.log(`  - TW Android: 點擊=${twAndroidData.clicks}, 安裝=${twAndroidData.installs}, 收益=${twAndroidData.revenue}`);
      Logger.log(`  - TW iOS: 點擊=${twIosData.clicks}, 安裝=${twIosData.installs}, 收益=${twIosData.revenue}`);
      Logger.log(`  - HK Android: 點擊=${hkAndroidData.clicks}, 安裝=${hkAndroidData.installs}, 收益=${hkAndroidData.revenue}`);
      Logger.log(`  - HK iOS: 點擊=${hkIosData.clicks}, 安裝=${hkIosData.installs}, 收益=${hkIosData.revenue}`);
    } else {
      Logger.log(`✗ 找不到日期 "${dateStringInSheet}" (標準化: "${normalizedSheetDate}") 的數據`);
    }
  });
  
  Logger.log('總覽儀表板更新完畢！');
}

function fetchSingleReport(datePeriod, metrics, eventTokenFilter) {
  const apiToken = PropertiesService.getScriptProperties().getProperty('ADJUST_API_TOKEN');
  if (!apiToken) { Logger.log('錯誤：找不到 API Token。'); return null; }
  const baseUrl = 'https://automate.adjust.com/reports-service/csv_report';
  const params = {
    'app_token__in': APP_TOKENS, 'date_period': datePeriod, 'dimensions': DIMENSIONS,
    'metrics': metrics, 'ad_spend_mode': 'network'
  };
  if (eventTokenFilter) { params.event_token__in = eventTokenFilter; }
  const queryString = Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key])).join('&');
  const fullUrl = baseUrl + '?' + queryString;
  Logger.log(`正在請求報表... URL: ${fullUrl}`);
  const options = {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + apiToken, 'x-account-id': ACCOUNT_ID },
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(fullUrl, options);
  if (response.getResponseCode() === 200) {
    const data = Utilities.parseCsv(response.getContentText());
    if (data.length > 1) { return data; }
  } else { Logger.log(`請求報表失敗！狀態碼: ${response.getResponseCode()}, 錯誤訊息: ${response.getContentText()}`); }
  return null;
}

function writeDataToSheet(data, sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) { sheet = spreadsheet.insertSheet(sheetName); }
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

function formatDateForAPI(date) {
  return Utilities.formatDate(date, "UTC", "yyyy-MM-dd");
}

// ===============================================================
// ===                      除錯輔助函式                        ===
// ===============================================================

/**
 * 除錯用：檢查聚合後的數據
 */
function debugAggregatedData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sourceSheet = ss.getSheetByName(RAW_DATA_SHEET_NAME);
  const sourceData = sourceSheet.getDataRange().getDisplayValues();
  const headers = sourceData[0];
  
  Logger.log('Headers: ' + JSON.stringify(headers));
  Logger.log('First 3 data rows:');
  for (let i = 1; i < Math.min(4, sourceData.length); i++) {
    Logger.log(`Row ${i}: ${JSON.stringify(sourceData[i])}`);
  }
}

/**
 * 除錯用：檢查 Daily Report 的日期範圍
 */
function debugSummaryDates() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  const summaryDates = summarySheet.getRange('E5:E35').getDisplayValues();
  
  Logger.log('Summary Sheet Dates:');
  summaryDates.forEach((row, index) => {
    Logger.log(`Row ${index + 5}: ${row[0]}`);
  });
} 