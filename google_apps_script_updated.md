# 更新的 Google Apps Script 程式碼

## 新的 Google Apps Script 程式碼（已移除統計工作表）

請在 Google Apps Script 中使用以下更新的程式碼：

```javascript
function doPost(e) {
  let result;
  
  try {
    // 解析請求資料
    const data = JSON.parse(e.postData.contents);
    console.log('收到的資料:', data);
    
    // 取得試算表 ID
    const spreadsheetId = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // 使用前端傳來的工作表名稱
    const htmlSheetName = data.htmlSheetName || `${data.gameId}.html`;
    
    // 1. 建立 HTML 工作表
    let htmlSheet;
    try {
      htmlSheet = spreadsheet.getSheetByName(htmlSheetName);
      if (htmlSheet) {
        spreadsheet.deleteSheet(htmlSheet);
        console.log('已刪除既有的工作表:', htmlSheetName);
      }
    } catch (error) {
      // 工作表不存在，繼續建立
      console.log('工作表不存在，將建立新的:', htmlSheetName);
    }
    
    htmlSheet = spreadsheet.insertSheet(htmlSheetName);
    console.log('已建立工作表:', htmlSheetName);
    
    // 寫入 HTML 內容
    const htmlContent = data.htmlContent;
    if (!htmlContent) {
      throw new Error('沒有收到 HTML 內容');
    }
    
    const htmlLines = htmlContent.split('\n');
    console.log('HTML 內容行數:', htmlLines.length);
    
    // 將 HTML 內容寫入 A 欄，每行一個儲存格
    for (let i = 0; i < htmlLines.length; i++) {
      htmlSheet.getRange(i + 1, 1).setValue(htmlLines[i]);
    }
    
    console.log('HTML 內容寫入完成');
    
    // 設定成功結果（不再包含統計工作表）
    result = {
      status: 'success',
      gameId: data.gameId,
      htmlSheetName: htmlSheetName,
      timestamp: new Date().toISOString()
    };
    
    console.log('處理成功:', result);
      
  } catch (error) {
    console.error('處理錯誤：', error);
    
    // 設定錯誤結果
    result = {
      status: 'error',
      message: error.toString()
    };
  }
  
  // 回傳結果
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 主要變更

1. **移除統計工作表處理**
   - 不再建立 `result_` 開頭的統計工作表
   - 不再處理 `playerStats` 資料

2. **簡化工作表命名**
   - 使用前端傳來的 `htmlSheetName`
   - 格式：`{gameCode}.html`

3. **簡化回傳結果**
   - 移除 `statsSheetName` 欄位
   - 只回傳 HTML 工作表相關資訊

4. **改善錯誤處理**
   - 加入更多console.log記錄
   - 更好的錯誤訊息

## 測試建議

更新程式碼後，建議：
1. 先用測試資料試跑一次
2. 檢查工作表是否正確建立
3. 確認HTML內容完整寫入
4. 檢查命名格式是否正確

---
*此版本移除了統計工作表功能，只專注於HTML工作表的生成*
