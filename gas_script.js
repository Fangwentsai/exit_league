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