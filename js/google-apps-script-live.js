/**
 * ========== 難找的直播中心 (Live Stream Automation) ==========
 * 這段程式碼請貼上到 Google Apps Script (打開您的 Google Sheets -> 擴充功能 -> Apps Script)
 * 貼上完成後，點擊右上角「部署」->「新增部署作業」
 * 類型：網頁應用程式 (Web App)
 * 存取權限：所有人 (Anyone)
 * 最後會獲得一個「網頁應用程式網址」，請把那個網址貼到前端網站的 `js/live.js` 裡。
 */

// =================== 請填寫以下兩個設定 ===================

// 1. YouTube Data API Key 
// (請前往 Google Cloud Console 申請並開啟 YouTube Data API v3 權限)
const YOUTUBE_API_KEY = '請替換為您的_YOUTUBE_API_KEY';

// 2. 您要自動巡邏的 YouTube 頻道 ID 列表
const TARGET_CHANNEL_IDS = [
  'UC1FqgJ1N7oV_mPZJkP3fJbw', // PERFECT (日本職業賽) - (頻道ID範例)
  'UCaW1vR9sJDE78mO8sX-R78Q', // DARTSLIVE JAPAN - (頻道ID範例)
  'UCR1AEL2X3-lS9eYgZcWng4Q'  // AA Studio - (頻道ID範例)
];

// =======================================================


// 存放直播快取資訊的分頁名稱
const SHEET_NAME = 'LiveCache';

/**
 * 網站前端透過 GET 請求呼叫時，觸發的主程式
 */
function doGet(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // 1. 如果分頁不存在，自動建立並寫入標題 (給管理員看)
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      sheet.appendRow(['Date', 'Live_ID', 'Platform', 'Expire_Time', 'Last_Check']);
    }
    
    // 2. 設定相關時間變數
    const now = new Date();
    // 使用台灣時間格式化當天日期，當作快取金鑰
    const todayStr = Utilities.formatDate(now, "Asia/Taipei", "yyyy-MM-dd");
    // 設定這筆快取的過期時間：今天的晚上 23:59:59
    const expireTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

    // 3. 讀取目前的「第一筆也是唯一一筆」Cache 狀態 (固定在第 2 橫列 A2:E2)
    const dataRange = sheet.getRange("A2:E2");
    const values = dataRange.getValues()[0];
    const savedDate = values[0];       // A2 - 紀錄的日期
    const savedLiveId = values[1];     // B2 - 有抓到就是ID，沒抓到就是 NOT_FOUND
    const savedExpire = values[3];     // D2 - Expire_Time (Time stamp)

    // 決定是否真的要去呼叫（消耗） YouTube API
    let shouldFetchYoutube = false;
    let lastCheckTime = values[4] ? new Date(values[4]).getTime() : 0;
    
    // A. 如果「紀錄上的日期不是今天」，就一定要查
    if (savedDate !== todayStr) {
      shouldFetchYoutube = true; 
    } 
    // B. 如果今天有查過但是「沒找到直播」(NOT_FOUND)
    else if (savedLiveId === 'NOT_FOUND' || savedLiveId === '') {
      // 為了避免一直沒找到就一直消耗 API，設定「冷卻時間 30 分鐘」
      // 距離上次尋找如果超過 30 分鐘，就可以再戳一次 API 來碰碰運氣
      if ((now.getTime() - lastCheckTime) > (30 * 60 * 1000)) {
         shouldFetchYoutube = true;
      }
    }

    // ===================================
    // 情況 一：不需要查 YouTube，直接回傳快取結果
    // ===================================
    if (!shouldFetchYoutube) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        source: 'GoogleSheetCache', // 標示為沒花費點數
        hasLive: (savedLiveId !== 'NOT_FOUND' && savedLiveId !== ''),
        liveId: savedLiveId === 'NOT_FOUND' ? null : savedLiveId,
        date: savedDate,
        message: 'Loaded from sheet without hitting YouTube API.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    
    // ===================================
    // 情況 二：需要查 YouTube (第一位訪客觸發，或是過了半小時的冷卻期)
    // ===================================
    let foundLiveId = null;
    let foundPlatform = null;

    // 依序檢查我們指定的那些頻道，有沒有人正在直播
    for (let i = 0; i < TARGET_CHANNEL_IDS.length; i++) {
        const channelId = TARGET_CHANNEL_IDS[i];
        if (!channelId) continue;
        
        try {
            // eventType=live 限定只找直播中
            const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;
            const response = UrlFetchApp.fetch(ytUrl, { muteHttpExceptions: true });
            const json = JSON.parse(response.getContentText());
            
            // 如果 items 有東西，代表這個頻道正在直播！
            if (json.items && json.items.length > 0) {
               foundLiveId = json.items[0].id.videoId;
               foundPlatform = 'YouTube';
               break; // 只要找到一家在直播，就直接跳出迴圈，省下後續的點數！
            }
        } catch (err) {
            // 直接忽略該頻道的搜尋錯誤，繼續檢查下一個
        }
    }

    // 決定要寫入試算表的值
    const finalLiveId = foundLiveId ? foundLiveId : 'NOT_FOUND';
    
    // 覆寫回 A2:E2，替當天後面幾千個訪客把結果快取起來
    dataRange.setValues([[
       todayStr, 
       finalLiveId, 
       foundPlatform || '', 
       expireTime, 
       now.getTime()
    ]]);

    // 回傳給觸發了這一切的前端訪客
    return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        source: 'YouTubeAPI', // 標示為有真實消耗 API
        hasLive: !!foundLiveId,
        liveId: foundLiveId,
        date: todayStr,
        message: 'Fetched fresh data from YouTube API and cached.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 捕捉所有意外錯誤，回傳給網頁以利除錯
    return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
