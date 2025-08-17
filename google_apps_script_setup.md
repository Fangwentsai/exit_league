# Google Apps Script 設定說明

## 新的 Google Apps Script 程式碼

請在 Google Apps Script 中建立新的專案，並使用以下程式碼：

```javascript
function doPost(e) {
  try {
    // 解析請求資料
    const data = JSON.parse(e.postData.contents);
    
    // 取得試算表 ID
    const spreadsheetId = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // 生成時間戳記
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const gameCode = data.gameId;
    
    // 1. 建立 HTML 工作表
    const htmlSheetName = `${gameCode}_${timestamp}`;
    let htmlSheet;
    try {
      htmlSheet = spreadsheet.getSheetByName(htmlSheetName);
      if (htmlSheet) {
        spreadsheet.deleteSheet(htmlSheet);
      }
    } catch (error) {
      // 工作表不存在，繼續建立
    }
    
    htmlSheet = spreadsheet.insertSheet(htmlSheetName);
    
    // 寫入 HTML 內容
    const htmlContent = data.htmlContent;
    const htmlLines = htmlContent.split('\n');
    
    // 將 HTML 內容寫入 A 欄，每行一個儲存格
    for (let i = 0; i < htmlLines.length; i++) {
      htmlSheet.getRange(i + 1, 1).setValue(htmlLines[i]);
    }
    
    // 2. 建立選手統計工作表
    const statsSheetName = `result_${timestamp}`;
    let statsSheet;
    try {
      statsSheet = spreadsheet.getSheetByName(statsSheetName);
      if (statsSheet) {
        spreadsheet.deleteSheet(statsSheet);
      }
    } catch (error) {
      // 工作表不存在，繼續建立
    }
    
    statsSheet = spreadsheet.insertSheet(statsSheetName);
    
    // 寫入選手統計資料
    const playerStats = data.playerStats;
    
    // 寫入標題行
    const headers = ['選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數'];
    statsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // 寫入客場選手統計
    let currentRow = 2;
    statsSheet.getRange(currentRow, 1).setValue('=== 客場選手 ===');
    currentRow++;
    
    playerStats.away.forEach(player => {
      statsSheet.getRange(currentRow, 1, 1, 8).setValues([[
        player.name,
        player.o1Games,
        player.o1Wins,
        player.crGames,
        player.crWins,
        player.totalGames,
        player.totalWins,
        player.firstAttacks
      ]]);
      currentRow++;
    });
    
    // 寫入主場選手統計
    currentRow++;
    statsSheet.getRange(currentRow, 1).setValue('=== 主場選手 ===');
    currentRow++;
    
    playerStats.home.forEach(player => {
      statsSheet.getRange(currentRow, 1, 1, 8).setValues([[
        player.name,
        player.o1Games,
        player.o1Wins,
        player.crGames,
        player.crWins,
        player.totalGames,
        player.totalWins,
        player.firstAttacks
      ]]);
      currentRow++;
    });
    
    // 設定欄寬
    statsSheet.autoResizeColumns(1, 8);
    
    // 回傳成功訊息
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        gameId: data.gameId,
        htmlSheetName: htmlSheetName,
        statsSheetName: statsSheetName,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('錯誤：', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('Google Apps Script 服務正常運行')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## 部署步驟

1. 前往 [Google Apps Script](https://script.google.com/)
2. 建立新專案
3. 貼上上述程式碼
4. 儲存專案
5. 點擊「部署」→「新增部署」
6. 選擇「網頁應用程式」
7. 設定存取權限為「任何人」
8. 部署後複製網頁應用程式 URL
9. 將 URL 更新到 `js/admin-main.js` 中的 `scriptURL` 變數

## 注意事項

- 確保試算表 ID 正確：`1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE`
- 確保有足夠的權限寫入試算表
- 每次保存會建立兩個新工作表：
  - HTML 工作表：`{gameCode}_{timestamp}`
  - 統計工作表：`result_{timestamp}`
