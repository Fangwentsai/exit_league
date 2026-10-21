// =====================================================
// 插入空白列（修正手動編輯造成的區塊分隔問題用）
// 貼在 doPost 裡其他 data.action === '...' 判斷式旁邊即可（例如緊接在
// 'logOcrResult' 那段後面）。
// =====================================================

// ===== 插入空白列 =====
if (data.action === 'insertBlankRow' && data.sheet && data.beforeRow) {
  var ssIns = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
  var sheetIns = ssIns.getSheetByName(data.sheet);
  if (!sheetIns) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: "Sheet '" + data.sheet + "' not found" })).setMimeType(ContentService.MimeType.JSON);
  }
  sheetIns.insertRowBefore(data.beforeRow);
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: '已在第 ' + data.beforeRow + ' 列前插入空白列' })).setMimeType(ContentService.MimeType.JSON);
}
