// =====================================================
// Admin GAS — 完整版 Code.gs
// 功能：比賽上傳 + GitHub push + 自動排行榜 + 6場偵測 + data重複寫入檢測
// 最後更新：2026/10/07 — parseScoresFromHtml 改成支援新版型（matchMeta
// 現算分數），舊版型 regex 解法保留當備援；其餘函式內容不變。
// =====================================================

var WEEKLY_SHEET_ID = '1APUuzy6Dcbi1sWGUVvrbrluEvKsktRvPYygASofekKQ';
var NOTIFY_EMAIL = 'fangwentsai14@gmail.com';
var GAMES_PER_WEEK = 6;
var DEFAULT_DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_llME3UGDmsL3mdPFMhtpNPi1JmM0/CJN21VcKDS';

// 第七屆起兩組並行，news.html 的個人榜有「組別」欄，寫入排行榜時要一起帶上。
// ⚠️ 隊名有變動（改名、換隊、新賽季重新分組）時，這份名單要跟著更新，
// 不然新隊伍在表格裡會顯示「-」。
var TEAM_GROUPS = {
  '酒空組': '掉鏢', '軟飯揪團中': '掉鏢', '人生揪難亮': '掉鏢',
  '傑克紅心': '掉鏢', 'Tonight29發財隊': '掉鏢', '匪類里民一直喝': '掉鏢',
  '逃生Zoo口': '靶外', '有點傻': '靶外', '嘻嘻隊': '靶外',
  '哈哈隊': '靶外', '傑克黑桃': '靶外', 'Tonight29恭喜隊': '靶外'
};
function groupLabelOf(team) {
  return TEAM_GROUPS[team] || '-';
}

// =====================================================
// doGet / doPost 主入口
// =====================================================

function doGet(e) {
  return ContentService.createTextOutput("Connection Ready! Clawd is online.");
}

function doPost(e) {
  let result;

  try {
    const data = JSON.parse(e.postData.contents);

    // ===== GitHub 上傳請求 =====
    if (data.action === 'uploadToGitHub') {
      return handleGitHubUploadRequest(data);
    }

    // ===== GitHub 刪除請求 =====
    if (data.action === 'deleteFromGitHub') {
      return handleGitHubDeleteRequest(data);
    }

    // ===== 刪除隊員請求 =====
    if (data.action === 'removePlayer') {
      removePlayerFromPersonalSheet(data.teamName, data.playerName);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: '已刪除隊員' })).setMimeType(ContentService.MimeType.JSON);
    }

    // ===== 週報自動化寫入 =====
    if (data.action === 'weeklyUpdate') {
      return handleWeeklyUpdate(data);
    }

    // ===== 只寫 data sheet（補寫選手數據用）=====
    if (data.writeDataOnly && data.playerStats) {
      var ss3 = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
      writePlayerDataToSheet(ss3, data.playerStats, data.awayTeam || '', data.homeTeam || '', data.gameDate || '');
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success', message: '已寫入 data sheet - ' + (data.awayTeam || '') + ' vs ' + (data.homeTeam || '')
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ===== OCR 辨識記錄 → 寫入 ocr_log 分頁 =====
    if (data.action === 'logOcrResult') {
      logOcrResultToSheet(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    // ===== 單格寫入（支援指定 sheet）=====
    if (data.cell && data.value !== undefined && !data.htmlContent) {
      var ss2 = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
      var sheetName = data.sheet || 'schedule';
      var sheet2 = ss2.getSheetByName(sheetName);
      if (!sheet2) {
        return ContentService.createTextOutput("Error: Sheet '" + sheetName + "' not found");
      }
      sheet2.getRange(data.cell).setValue(data.value);
      return ContentService.createTextOutput("Success: Wrote '" + data.value + "' to " + sheetName + "!" + data.cell);
    }

    // ===== 比賽結果上傳（主要流程）=====

    const spreadsheetId = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const gameCode = data.gameId;

    // 1. 建立 HTML 工作表（備份）
    const htmlSheetName = data.htmlSheetName || `${gameCode}.html`;
    let htmlSheet;

    try {
      htmlSheet = spreadsheet.getSheetByName(htmlSheetName);
      if (htmlSheet) {
        spreadsheet.deleteSheet(htmlSheet);
      }
    } catch (error) {}

    htmlSheet = spreadsheet.insertSheet(htmlSheetName);

    const htmlContent = data.htmlContent;
    if (!htmlContent) {
      throw new Error('HTML 內容為空');
    }

    const htmlLines = htmlContent.split('\n');
    for (let i = 0; i < htmlLines.length; i++) {
      htmlSheet.getRange(i + 1, 1).setValue(htmlLines[i]);
    }
    htmlSheet.setColumnWidth(1, 500);

    // 2. 上傳到 GitHub
    let githubResult = null;
    if (data.htmlContent && data.gameId) {
      try {
        const season = getSeasonFromGameId(data.gameId) || 'season7';
        const filePath = `game_result/${season}/${gameCode.toLowerCase()}.html`;
        const commitMessage = `Add ${gameCode.toUpperCase()} game result - ${data.awayTeam || ''} vs ${data.homeTeam || ''}`;

        githubResult = uploadFileToGitHub(filePath, data.htmlContent, commitMessage);

        if (githubResult.status === 'success') {
          Logger.log('✅ GitHub 上傳成功: ' + filePath);
        } else {
          Logger.log('⚠️ GitHub 上傳失敗: ' + githubResult.message);
        }
      } catch (githubError) {
        Logger.log('❌ GitHub 上傳錯誤: ' + githubError.toString());
        githubResult = { status: 'error', message: githubError.toString() };
      }
    }

    // 3. 【自動化】寫入排行榜 + 選手數據 + 偵測6場完成
    if (data.htmlContent && data.gameId) {
      try {
        afterGameUpload(data);
      } catch (autoError) {
        Logger.log('❌ afterGameUpload 錯誤: ' + autoError.toString());
      }

      // 4. 觸發 Vercel Production 部署
      triggerVercelDeploy();
    }

    result = {
      status: 'success',
      gameId: data.gameId,
      htmlSheetName: htmlSheetName,
      htmlSheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${htmlSheet.getSheetId()}`,
      timestamp: new Date().toISOString(),
      githubUpload: githubResult,
      message: `HTML 已保存（${htmlSheetName}）`
    };

  } catch (error) {
    Logger.log('❌ 錯誤：' + error.toString());
    result = { status: 'error', message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
// Vercel 自動部署（極速非阻塞版）
// =====================================================

function triggerVercelDeploy() {
  try {
    var props = PropertiesService.getScriptProperties();
    var deployHook = props.getProperty('VERCEL_DEPLOY_HOOK') || DEFAULT_DEPLOY_HOOK;

    if (deployHook) {
      var hookRes = UrlFetchApp.fetch(deployHook, { method: 'POST', muteHttpExceptions: true });
      Logger.log('🚀 Vercel Deploy Hook 觸發結果: ' + hookRes.getResponseCode());
    }
  } catch (e) {
    Logger.log('⚠️ Vercel 部署觸發失敗: ' + e.toString());
  }
}

// =====================================================
// OCR 辨識記錄 → 寫入 ocr_log 分頁
// 記錄的是修正前的原始判讀結果，供之後跟 game_result 的正確答案比對用
// =====================================================

function logOcrResultToSheet(data) {
  try {
    var ss = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
    var sheet = ss.getSheetByName('ocr_log');
    if (!sheet) {
      sheet = ss.insertSheet('ocr_log');
      sheet.appendRow(['時間', '場次', '主隊', '客隊', '原始辨識結果(JSON)']);
    }
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.gameCode || '',
      data.homeTeam || '',
      data.awayTeam || '',
      JSON.stringify(data.result || {})
    ]);
    Logger.log('✅ OCR 記錄已寫入: ' + data.gameCode);
  } catch (e) {
    Logger.log('❌ logOcrResultToSheet 錯誤: ' + e.toString());
  }
}

// =====================================================
// 自動化：比賽上傳後自動更新排行榜
// =====================================================

function afterGameUpload(data) {
  try {
    var ss = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
    var gameCode = data.gameId || '';
    var gameNum = parseInt(gameCode.replace(/\D/g, ''));

    // 1a: 解析 HTML 比分 → 寫入 schedule
    var gameScores = parseScoresFromHtml(data.htmlContent, gameCode);
    if (gameScores) {
      writeGameToSchedule(ss, gameScores);
      Logger.log('✅ 已寫入 schedule - ' + gameScores.gId);
    }

    // 1b: 寫入選手數據到 data 頁籤
    var playerStats = data.playerStats;
    var awayTeam = data.awayTeam || (gameScores ? gameScores.awayTeam : '');
    var homeTeam = data.homeTeam || (gameScores ? gameScores.homeTeam : '');

    if (!playerStats || (playerStats.away.length === 0 && playerStats.home.length === 0)) {
      playerStats = parsePlayerStatsFromHtml(data.htmlContent);
    }

    if (playerStats && (playerStats.away.length > 0 || playerStats.home.length > 0)) {
      writePlayerDataToSheet(ss, playerStats, awayTeam, homeTeam, data.gameDate || '');
      Logger.log('✅ 已寫入 data 頁籤選手數據');
    }

    SpreadsheetApp.flush();

    // 2: 讀取排行榜 → 更新 news.html → push GitHub
    var rankings = readRankingsFromSheets(ss);
    if (rankings) {
      updateAndPushNewsHtml(rankings);
      Logger.log('✅ 已更新 news.html 排行榜');
    }

    // 3: 檢查本週 6 場是否全部完成
    checkWeekComplete(ss, gameNum);

  } catch (error) {
    Logger.log('❌ afterGameUpload 錯誤: ' + error.toString());
  }
}

// =====================================================
// 選手數據寫入 data 頁籤
// =====================================================

function writePlayerDataToSheet(ss, playerStats, awayTeam, homeTeam, gameDate) {
  var sheet = ss.getSheetByName('data');
  if (!sheet) { Logger.log('找不到 data 頁籤'); return; }

  var newPlayerNames = [];
  if (playerStats.away) playerStats.away.forEach(function(p) { newPlayerNames.push(p.name); });
  if (playerStats.home) playerStats.home.forEach(function(p) { newPlayerNames.push(p.name); });

  if (newPlayerNames.length > 0 && gameDate) {
    var lastRow = sheet.getLastRow();
    if (lastRow >= 1) {
      var allData = sheet.getRange(1, 1, lastRow, 8).getValues();
      var blocksToDelete = [];

      for (var i = 0; i < allData.length; i++) {
        var cellValue = String(allData[i][0]).trim();
        if (cellValue === String(gameDate).trim()) {
          var blockStart = i;
          var blockEnd = i;
          var existingPlayers = [];

          for (var j = i + 1; j < allData.length; j++) {
            var rowFirst = String(allData[j][0]).trim();
            if (rowFirst === '' || rowFirst.match(/^\d{4}\//) || rowFirst.match(/^\d{1,2}\//)) {
              var isEmptyRow = allData[j].every(function(cell) { return String(cell).trim() === ''; });
              if (isEmptyRow) {
                blockEnd = j;
                break;
              }
              if (rowFirst.match(/^\d{4}\//) || (rowFirst.match(/^\d{1,2}\//) && !rowFirst.match(/^選手$/))) {
                break;
              }
            }
            blockEnd = j;
            if (rowFirst === '選手') continue;
            if (rowFirst && rowFirst !== '選手') {
              existingPlayers.push(rowFirst);
            }
          }

          var matchCount = 0;
          existingPlayers.forEach(function(name) {
            if (newPlayerNames.indexOf(name) >= 0) matchCount++;
          });

          if (matchCount >= 2 || (existingPlayers.length > 0 && matchCount === existingPlayers.length)) {
            var deleteStart = blockStart;
            if (deleteStart > 0) {
              var prevRow = allData[deleteStart - 1];
              var isPrevEmpty = prevRow.every(function(cell) { return String(cell).trim() === ''; });
              if (isPrevEmpty) deleteStart = deleteStart - 1;
            }
            blocksToDelete.push({ startRow: deleteStart + 1, endRow: blockEnd + 1 });
            Logger.log('🔍 發現重複區塊: 行 ' + (deleteStart + 1) + ' ~ ' + (blockEnd + 1));
          }
        }
      }

      if (blocksToDelete.length > 0) {
        blocksToDelete.reverse();
        blocksToDelete.forEach(function(block) {
          var numRows = block.endRow - block.startRow + 1;
          sheet.deleteRows(block.startRow, numRows);
          Logger.log('🗑️ 已刪除重複區塊: 行 ' + block.startRow + ' ~ ' + block.endRow);
        });
      }
    }
  }

  var lastRow = sheet.getLastRow();
  var rows = [];

  if (lastRow >= 1) { rows.push(['', '', '', '', '', '', '', '']); }
  rows.push([gameDate, '', '', '', '', '', '', '']);

  var header = ['選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數'];

  if (playerStats.away && playerStats.away.length > 0) {
    rows.push(header);
    playerStats.away.forEach(function(p) {
      rows.push([p.name, p.p01, p.w01, p.pCR, p.wCR, p.total, p.wins, p.fa]);
    });
  }

  if (playerStats.home && playerStats.home.length > 0) {
    rows.push(header);
    playerStats.home.forEach(function(p) {
      rows.push([p.name, p.p01, p.w01, p.pCR, p.wCR, p.total, p.wins, p.fa]);
    });
  }

  if (rows.length === 0) return;

  var startRow = lastRow + 1;
  sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);
  Logger.log('✅ data 頁籤：已寫入 ' + rows.length + ' 列');
}

// =====================================================
// 解析 HTML 選手數據
// =====================================================

function parsePlayerStatsFromHtml(htmlContent) {
  try {
    var matchBlock = htmlContent.match(/const \w+Matches = \[([\s\S]*?)\];/);
    if (!matchBlock) { Logger.log('⚠️ 找不到 match data'); return null; }

    var matchStr = matchBlock[1];
    var matchRegex = /\{[^}]*type:\s*'(\w+)'[^}]*away:\s*(\[[^\]]*\]|'[^']*')[^}]*home:\s*(\[[^\]]*\]|'[^']*')[^}]*firstAttack:\s*'(\w+)'[^}]*winner:\s*'(\w+)'/g;
    var m;
    var stats = {};

    while ((m = matchRegex.exec(matchStr)) !== null) {
      var type = m[1];
      var awayRaw = m[2];
      var homeRaw = m[3];
      var firstAttack = m[4];
      var winner = m[5];

      var awayPlayers = parsePlayerNames(awayRaw);
      var homePlayers = parsePlayerNames(homeRaw);

      processPlayers(stats, awayPlayers, 'away', type, firstAttack, winner);
      processPlayers(stats, homePlayers, 'home', type, firstAttack, winner);
    }

    var awayStats = []; var homeStats = [];
    for (var key in stats) {
      var s = stats[key];
      var row = { name: s.name, p01: s.p01, w01: s.w01, pCR: s.pCR, wCR: s.wCR, total: s.total, wins: s.wins, fa: s.fa };
      if (s.side === 'away') awayStats.push(row);
      else homeStats.push(row);
    }

    if (awayStats.length === 0 && homeStats.length === 0) return null;
    return { away: awayStats, home: homeStats };
  } catch (e) {
    Logger.log('❌ parsePlayerStatsFromHtml 錯誤: ' + e.toString());
    return null;
  }
}

function parsePlayerNames(raw) {
  raw = raw.trim();
  if (raw.charAt(0) === '[') {
    var names = [];
    var nameRegex = /'([^']+)'/g;
    var nm;
    while ((nm = nameRegex.exec(raw)) !== null) { names.push(nm[1]); }
    return names;
  } else {
    var single = raw.match(/'([^']+)'/);
    return single ? [single[1]] : [];
  }
}

function processPlayers(stats, players, side, type, firstAttack, winner) {
  for (var i = 0; i < players.length; i++) {
    var name = players[i];
    var key = side + ':' + name;
    if (!stats[key]) {
      stats[key] = { name: name, side: side, p01: 0, w01: 0, pCR: 0, wCR: 0, total: 0, wins: 0, fa: 0 };
    }
    var s = stats[key];
    if (type === '01') { s.p01++; } else { s.pCR++; }
    s.total++;
    if (winner === side) {
      if (type === '01') { s.w01++; } else { s.wCR++; }
      s.wins++;
    }
    if (firstAttack === side) { s.fa++; }
  }
}

// =====================================================
// 1. 解析 HTML 比分 + 飲酒加成 + 和局 (L, M 欄)
//
// 2026/10/07 修正：js/preview_generator.js 最近改成新版型渲染（HTML 裡
// 不再寫死 <div class="team-name">／<div class="team-score">，比分改成
// 瀏覽器載入後才用 renderMatchResult() 從 matchMeta + 逐局資料現算），
// 導致原本的 regex 寫法完全抓不到東西，schedule 的 D/F 欄從上週切版型
// 後就沒再寫入過。
//
// 修法：新版型優先，從 matchMeta + drinkingBonus + 逐局 matches 陣列
// 自己重算一次分數（權重規則跟 js/game_result.js 的 calculateMatchScore
// 完全一致：1,2,3,4,6,7,8,9 set = 1分，11,12,13,14 = 2分，5,10 = 3分，
// 15,16 = 4分，勝隊加1分，再加飲酒加成）；抓不到 matchMeta 就當作舊版型，
// 照原本的 team-name/team-score regex 解析，兩種檔案都吃得下。
// =====================================================

function parseScoresFromHtml(htmlContent, gameCode) {
  try {
    var metaMatch = htmlContent.match(/const matchMeta\s*=\s*\{([\s\S]*?)\n\};/);

    if (metaMatch) {
      // ===== 新版型：matchMeta + drinkingBonus + gXXMatches 陣列 =====
      var metaStr = metaMatch[1];
      var awayM = metaStr.match(/away:\s*"([^"]*)"/);
      var homeM = metaStr.match(/home:\s*"([^"]*)"/);
      var venueM = metaStr.match(/venue:\s*"([^"]*)"/);
      var awayTeam = awayM ? awayM[1] : '';
      var homeTeam = homeM ? homeM[1] : '';
      var venue = venueM ? venueM[1] : '';

      if (!awayTeam || !homeTeam) {
        Logger.log('⚠️ 新版型 matchMeta 缺隊名: ' + gameCode);
        return null;
      }

      var drunkTeam = '';
      var awayBonus = 0, homeBonus = 0;
      var drinkMatch = htmlContent.match(/const drinkingBonus\s*=\s*\{\s*away:\s*(\d+),\s*home:\s*(\d+)\s*\}/);
      if (drinkMatch) {
        awayBonus = parseInt(drinkMatch[1]);
        homeBonus = parseInt(drinkMatch[2]);
        if (awayBonus > 0) drunkTeam = awayTeam;
        if (homeBonus > 0) drunkTeam = homeTeam;
      }

      var matchBlock = htmlContent.match(/const \w+Matches\s*=\s*\[([\s\S]*?)\];/);
      if (!matchBlock) {
        Logger.log('⚠️ 新版型找不到逐局資料: ' + gameCode);
        return null;
      }

      var setRegex = /\{set:\s*(\d+)[^}]*winner:\s*'(\w+)'/g;
      var weightOf = function (set) {
        if ([1, 2, 3, 4, 6, 7, 8, 9].indexOf(set) >= 0) return 1;
        if ([11, 12, 13, 14].indexOf(set) >= 0) return 2;
        if ([5, 10].indexOf(set) >= 0) return 3;
        if ([15, 16].indexOf(set) >= 0) return 4;
        return 0;
      };

      var awayBase = 0, homeBase = 0, sm;
      while ((sm = setRegex.exec(matchBlock[1])) !== null) {
        var w = weightOf(parseInt(sm[1]));
        if (sm[2] === 'away') awayBase += w;
        else if (sm[2] === 'home') homeBase += w;
      }

      var awayWinBonus = awayBase > homeBase ? 1 : 0;
      var homeWinBonus = homeBase > awayBase ? 1 : 0;
      var awayScore = awayBase + awayWinBonus + awayBonus;
      var homeScore = homeBase + homeWinBonus + homeBonus;

      var isDraw = (awayBase === homeBase);
      var winner = awayBase > homeBase ? awayTeam : (homeBase > awayBase ? homeTeam : '');
      var loser = awayBase > homeBase ? homeTeam : (homeBase > awayBase ? awayTeam : '');
      var draw1 = isDraw ? homeTeam : '';
      var draw2 = isDraw ? awayTeam : '';

      return {
        gId: gameCode.toUpperCase(), awayTeam: awayTeam, awayScore: awayScore,
        homeScore: homeScore, homeTeam: homeTeam, venue: venue, winner: winner,
        loser: loser, drunkTeam: drunkTeam, draw1: draw1, draw2: draw2
      };
    }

    // ===== 舊版型：team-name / team-score 寫死在 HTML 裡，照原本的解法 =====
    var awayMatch = htmlContent.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
    var homeMatch = htmlContent.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
    var scoreMatches = htmlContent.match(/<div class="team-score">(\d+)<\/div>/g);
    var venueMatch = htmlContent.match(/<div class="venue-info">(.*?)<\/div>/);

    if (!awayMatch || !homeMatch || !scoreMatches || scoreMatches.length < 2) {
      Logger.log('⚠️ 無法解析 HTML 比分（新舊版型都沒對上）: ' + gameCode);
      return null;
    }

    var oldAwayTeam = awayMatch[1].trim();
    var oldHomeTeam = homeMatch[1].trim();
    var oldAwayScore = parseInt(scoreMatches[0].match(/(\d+)/)[1]);
    var oldHomeScore = parseInt(scoreMatches[1].match(/(\d+)/)[1]);
    var oldVenue = venueMatch ? venueMatch[1].trim() : '';

    var oldDrunkTeam = '';
    var oldAwayBonus = 0, oldHomeBonus = 0;
    var oldDrinkMatch = htmlContent.match(/const drinkingBonus\s*=\s*\{\s*away:\s*(\d+),\s*home:\s*(\d+)\s*\}/);
    if (oldDrinkMatch) {
      oldAwayBonus = parseInt(oldDrinkMatch[1]);
      oldHomeBonus = parseInt(oldDrinkMatch[2]);
      if (oldAwayBonus > 0) oldDrunkTeam = oldAwayTeam;
      if (oldHomeBonus > 0) oldDrunkTeam = oldHomeTeam;
    }

    var oldAwayBaseScore = oldAwayScore - oldAwayBonus;
    var oldHomeBaseScore = oldHomeScore - oldHomeBonus;
    var oldIsDraw = (oldAwayBaseScore === oldHomeBaseScore);
    var oldWinner = oldAwayBaseScore > oldHomeBaseScore ? oldAwayTeam : (oldHomeBaseScore > oldAwayBaseScore ? oldHomeTeam : '');
    var oldLoser = oldAwayBaseScore > oldHomeBaseScore ? oldHomeTeam : (oldHomeBaseScore > oldAwayBaseScore ? oldAwayTeam : '');
    var oldDraw1 = oldIsDraw ? oldHomeTeam : '';
    var oldDraw2 = oldIsDraw ? oldAwayTeam : '';

    return {
      gId: gameCode.toUpperCase(), awayTeam: oldAwayTeam, awayScore: oldAwayScore,
      homeScore: oldHomeScore, homeTeam: oldHomeTeam, venue: oldVenue, winner: oldWinner,
      loser: oldLoser, drunkTeam: oldDrunkTeam, draw1: oldDraw1, draw2: oldDraw2
    };
  } catch (e) {
    Logger.log('❌ parseScoresFromHtml 錯誤: ' + e.toString());
    return null;
  }
}

// =====================================================
// 2. 寫入 schedule 工作表（欄位 I:勝, J:敗, K:酒, L:和局1, M:和局2）
// =====================================================

function writeGameToSchedule(ss, gameData) {
  var sheet = ss.getSheetByName('schedule');
  if (!sheet) { Logger.log('找不到 schedule 頁籤'); return; }

  var lastRow = sheet.getLastRow();
  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  var targetRow = -1;
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).trim().toUpperCase() === gameData.gId.toUpperCase()) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    Logger.log('⚠️ schedule 找不到 ' + gameData.gId);
    return;
  }

  // D:客場分數, F:主場分數, H:比賽地點
  sheet.getRange(targetRow, 4).setValue(gameData.awayScore);
  sheet.getRange(targetRow, 6).setValue(gameData.homeScore);
  if (gameData.venue) { sheet.getRange(targetRow, 8).setValue(gameData.venue); }

  // I:勝, J:敗, K:酒, L:和局隊伍1, M:和局隊伍2
  sheet.getRange(targetRow, 9).setValue(gameData.winner || '');
  sheet.getRange(targetRow, 10).setValue(gameData.loser || '');
  sheet.getRange(targetRow, 11).setValue(gameData.drunkTeam || '');
  sheet.getRange(targetRow, 12).setValue(gameData.draw1 || '');
  sheet.getRange(targetRow, 13).setValue(gameData.draw2 || '');

  Logger.log('✅ schedule 已更新: ' + gameData.gId);
}

// =====================================================
// 讀取排行榜 + 更新 news.html
// =====================================================

function readRankingsFromSheets(ss) {
  try {
    var teamData = ss.getSheetByName('schedule').getRange('X2:Z13').getValues()
      .filter(function(r) { return r[1] && r[2]; });

    var personalSheet = ss.getSheetByName('personal');
    var allPlayers = personalSheet.getRange('A2:N' + personalSheet.getLastRow()).getValues()
      .filter(function(r) { return r[0] && r[1]; });

    var playerTop5 = allPlayers
      .map(function(r) { return { team: r[0], name: r[1], wins: parseInt(r[6]) || 0, winRate: r[7] || '0%' }; })
      .sort(function(a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (parseFloat(String(b.winRate).replace('%', '')) || 0) - (parseFloat(String(a.winRate).replace('%', '')) || 0);
      })
      .slice(0, 5);

    var topLadies = allPlayers
      .filter(function(r) { return String(r[13]).trim() === '女'; })
      .map(function(r) { return { team: r[0], name: r[1], wins: parseInt(r[6]) || 0 }; })
      .sort(function(a, b) { return b.wins - a.wins; })
      .slice(0, 5);

    var unlucky = allPlayers
      .filter(function(r) {
        var totalGames = parseInt(r[12]) || 0;
        var faRate = r[8];
        return totalGames > 0 && faRate !== '' && faRate !== null && faRate !== undefined && String(faRate).trim() !== 'DNP';
      })
      .map(function(r) {
        var raw = r[8];
        var faRateNum;
        var faRateStr;
        if (typeof raw === 'number') {
          faRateNum = raw * 100;
          faRateStr = faRateNum.toFixed(2) + '%';
        } else {
          faRateNum = parseFloat(String(raw).replace('%', '')) || 100;
          faRateStr = faRateNum.toFixed(2) + '%';
        }
        return { team: r[0], name: r[1], faRate: faRateStr, faRateNum: faRateNum };
      })
      .sort(function(a, b) { return a.faRateNum - b.faRateNum; })
      .slice(0, 5);

    return { teams: teamData, players: playerTop5, ladies: topLadies, unlucky: unlucky };
  } catch (e) {
    Logger.log('❌ readRankingsFromSheets 錯誤: ' + e.toString());
    return null;
  }
}

function getFileFromGitHub(filePath) {
  var properties = PropertiesService.getScriptProperties();
  var token = properties.getProperty('GITHUB_TOKEN');
  var repoOwner = properties.getProperty('GITHUB_REPO_OWNER');
  var repoName = properties.getProperty('GITHUB_REPO_NAME');
  var branch = properties.getProperty('GITHUB_BRANCH') || 'main';

  var response = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/' + filePath + '?ref=' + branch,
    { method: 'GET', headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Google-Apps-Script' }, muteHttpExceptions: true }
  );

  if (response.getResponseCode() !== 200) { throw new Error('GitHub 讀取失敗: ' + response.getResponseCode()); }

  var fileData = JSON.parse(response.getContentText());
  return { content: Utilities.newBlob(Utilities.base64Decode(fileData.content)).getDataAsString('UTF-8'), sha: fileData.sha };
}

function updateAndPushNewsHtml(rankings) {
  var newsFile = getFileFromGitHub('pages/news.html');
  var html = newsFile.content;

  if (rankings.teams.length > 0) {
    var teamRows = rankings.teams.map(function(t) {
      var score = Math.round(parseFloat(t[2]) || 0);
      return '                    <tr><td>' + t[0] + '</td><td>' + t[1] + '</td><td>' + score + '</td></tr>';
    }).join('\n');
    html = html.replace(/<th>總分<\/th>\s*<\/tr>[\s\S]*?<\/table>/, '<th>總分</th>\n                    </tr>\n' + teamRows + '\n                </table>');
  }

  if (rankings.players.length > 0) {
    var playerRows = rankings.players.map(function(p) {
      return '                    <tr><td>' + groupLabelOf(p.team) + '</td><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.wins + '</td></tr>';
    }).join('\n');
    html = html.replace(/<th>勝場數<\/th>\s*<\/tr>\s*<tr>\s*<td>[\s\S]*?<\/table>/, '<th>勝場數</th>\n                    </tr>\n' + playerRows + '\n                </table>');
  }

  if (rankings.ladies.length > 0) {
    var ladyRows = rankings.ladies.map(function(p) {
      return '                    <tr><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.wins + '</td></tr>';
    }).join('\n');
    html = html.replace(/<h3 class="section-title">Top Lady 🌹<\/h3>\s*<table class="ranking-table">[\s\S]*?<\/table>/, '<h3 class="section-title">Top Lady 🌹</h3>\n                <table class="ranking-table">\n                    <tr>\n                        <th>隊名</th>\n                        <th>姓名</th>\n                        <th>勝場數</th>\n                    </tr>\n' + ladyRows + '\n                </table>');
  }

  if (rankings.unlucky.length > 0) {
    var unluckyRows = rankings.unlucky.map(function(p) {
      return '                    <tr><td>' + groupLabelOf(p.team) + '</td><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.faRate + '</td></tr>';
    }).join('\n');
    html = html.replace(/<th>先攻機率<\/th>\s*<\/tr>[\s\S]*?<\/table>/, '<th>先攻機率</th>\n                    </tr>\n' + unluckyRows + '\n                </table>');
  }

  uploadFileToGitHub('pages/news.html', html, '📊 自動更新排行榜');
  Logger.log('✅ news.html 排行榜已更新');
}

// =====================================================
// 偵測 6 場完成 + email 通知
// =====================================================

function checkWeekComplete(ss, currentGameNum) {
  try {
    var weekStart = Math.floor((currentGameNum - 1) / GAMES_PER_WEEK) * GAMES_PER_WEEK + 1;
    var weekEnd = weekStart + GAMES_PER_WEEK - 1;

    var sheet = ss.getSheetByName('schedule');
    var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

    var completedGames = [];
    var missingGames = [];

    for (var g = weekStart; g <= weekEnd; g++) {
      var gId = 'G' + g;
      var found = false;
      for (var i = 0; i < allData.length; i++) {
        if (String(allData[i][0]).trim().toUpperCase() === gId) {
          if (allData[i][3] !== '' && allData[i][3] !== null) {
            completedGames.push(gId);
          } else {
            missingGames.push(gId);
          }
          found = true;
          break;
        }
      }
      if (!found) missingGames.push(gId);
    }

    if (completedGames.length === GAMES_PER_WEEK && missingGames.length === 0) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        '🎯 本週 ' + GAMES_PER_WEEK + ' 場比賽全部完成！G' + weekStart + '~G' + weekEnd,
        '排行榜已自動更新到 yhdarts.com。\n\n完成場次：' + completedGames.join(', ') + '\n\n— 難找的聯賽自動化系統'
      );
    }
  } catch (e) {
    Logger.log('❌ checkWeekComplete 錯誤: ' + e.toString());
  }
}

// =====================================================
// 週報自動化寫入（weekly_update.js 用）
// =====================================================

function handleWeeklyUpdate(data) {
  try {
    var ss = SpreadsheetApp.openById(data.sheetId || WEEKLY_SHEET_ID);
    var scheduleUpdated = 0;
    var dataAppended = 0;

    if (data.matchRows && data.matchRows.length > 0) {
      scheduleUpdated = updateScheduleSheet(ss, data.matchRows);
    }
    if (data.playerRows && data.playerRows.length > 0) {
      dataAppended = appendToDataSheet(ss, data.playerRows);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', scheduleUpdated: scheduleUpdated, dataAppended: dataAppended, timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('handleWeeklyUpdate 錯誤: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateScheduleSheet(ss, matchRows) {
  var sheet = ss.getSheetByName('schedule');
  if (!sheet) return 0;
  var lastRow = sheet.getLastRow();
  var allData = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  var updatedCount = 0;

  matchRows.forEach(function(match) {
    var targetRowIndex = -1;
    for (var i = 0; i < allData.length; i++) {
      if (String(allData[i][0]).trim().toUpperCase() === match.gId.toUpperCase()) { targetRowIndex = i + 2; break; }
    }
    if (targetRowIndex === -1) { return; }

    sheet.getRange(targetRowIndex, 4).setValue(match.awayScore);
    sheet.getRange(targetRowIndex, 6).setValue(match.homeScore);
    sheet.getRange(targetRowIndex, 9).setValue(match.winner);
    sheet.getRange(targetRowIndex, 10).setValue(match.loser);
    if (match.venue) { sheet.getRange(targetRowIndex, 8).setValue(match.venue); }
    if (sheet.getLastColumn() >= 11) { sheet.getRange(targetRowIndex, 11).setValue(match.drunk || ''); }
    if (sheet.getLastColumn() >= 12) { sheet.getRange(targetRowIndex, 12).setValue(match.draw || ''); }
    updatedCount++;
  });
  return updatedCount;
}

function appendToDataSheet(ss, playerRows) {
  var sheet = ss.getSheetByName('data');
  if (!sheet) return 0;
  var lastRow = sheet.getLastRow();
  var rowsToAppend = [];
  var currentDate = '';

  playerRows.forEach(function(row) {
    if (row.type === 'date_header') {
      if (row.date !== currentDate) { rowsToAppend.push([row.date, '', '', '', '', '', '', '']); currentDate = row.date; }
    } else if (row.type === 'team_header') {
      rowsToAppend.push(['【' + row.team + '】選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數']);
    } else if (row.type === 'player') {
      rowsToAppend.push([row.name, row.p01, row.w01, row.pCR, row.wCR, row.total, row.wins, row.fa]);
    }
  });

  if (rowsToAppend.length === 0) return 0;
  if (lastRow >= 1) { rowsToAppend.unshift(['', '', '', '', '', '', '', '']); }
  sheet.getRange(lastRow + 1, 1, rowsToAppend.length, 8).setValues(rowsToAppend);
  return rowsToAppend.length;
}

// =====================================================
// GitHub API 操作
// =====================================================

function handleGitHubUploadRequest(data) {
  try {
    var result = uploadFileToGitHub(data.filePath, data.content, data.commitMessage);

    // 如果是新增隊員（player.json），同步寫入 personal sheet + 觸發 Vercel Production 部署
    if (result.status === 'success' && data.filePath === 'data/player.json' && data.teamName && data.playerName) {
      try {
        addPlayerToPersonalSheet(data.teamName, data.playerName);
        Logger.log('✅ 已將 ' + data.playerName + ' 寫入 personal sheet');
      } catch (personalErr) {
        Logger.log('⚠️ personal sheet 寫入失敗: ' + personalErr.toString());
      }

      // 觸發 Vercel Production 部署
      triggerVercelDeploy();
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGitHubDeleteRequest(data) {
  try {
    var result = deleteFileFromGitHub(data.filePath, data.commitMessage);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadFileToGitHub(filePath, content, commitMessage) {
  try {
    var properties = PropertiesService.getScriptProperties();
    var token = properties.getProperty('GITHUB_TOKEN');
    var repoOwner = properties.getProperty('GITHUB_REPO_OWNER');
    var repoName = properties.getProperty('GITHUB_REPO_NAME');
    var branch = properties.getProperty('GITHUB_BRANCH') || 'main';

    if (!token || !repoOwner || !repoName) { throw new Error('GitHub 設定不完整'); }

    var apiUrl = 'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/' + filePath;
    var contentBase64 = Utilities.base64Encode(Utilities.newBlob(content).getBytes());

    var sha = null;
    try {
      var checkResponse = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
        method: 'GET', headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Google-Apps-Script' }, muteHttpExceptions: true
      });
      if (checkResponse.getResponseCode() === 200) { sha = JSON.parse(checkResponse.getContentText()).sha; }
    } catch (e) {}

    var requestData = { message: commitMessage, content: contentBase64, branch: branch };
    if (sha) { requestData.sha = sha; }

    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'PUT',
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Google-Apps-Script' },
      payload: JSON.stringify(requestData), muteHttpExceptions: true
    });

    var responseCode = response.getResponseCode();
    if (responseCode === 200 || responseCode === 201) {
      var result = JSON.parse(response.getContentText());
      return { status: 'success', fileUrl: result.content.html_url, commitUrl: result.commit.html_url, filePath: filePath, sha: result.content.sha };
    } else {
      throw new Error('GitHub API 錯誤: ' + responseCode + ' - ' + response.getContentText().substring(0, 200));
    }
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

function deleteFileFromGitHub(filePath, commitMessage) {
  try {
    var properties = PropertiesService.getScriptProperties();
    var token = properties.getProperty('GITHUB_TOKEN');
    var repoOwner = properties.getProperty('GITHUB_REPO_OWNER');
    var repoName = properties.getProperty('GITHUB_REPO_NAME');
    var branch = properties.getProperty('GITHUB_BRANCH') || 'main';

    var apiUrl = 'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/' + filePath;

    var checkResponse = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
      method: 'GET', headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Google-Apps-Script' }, muteHttpExceptions: true
    });

    if (checkResponse.getResponseCode() === 404) {
      return { status: 'success', message: '文件不存在', filePath: filePath };
    }

    var sha = JSON.parse(checkResponse.getContentText()).sha;

    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'DELETE',
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Google-Apps-Script' },
      payload: JSON.stringify({ message: commitMessage || 'Delete ' + filePath, sha: sha, branch: branch }), muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      var result = JSON.parse(response.getContentText());
      return { status: 'success', commitUrl: result.commit.html_url, filePath: filePath };
    } else {
      throw new Error('GitHub API 錯誤: ' + response.getResponseCode());
    }
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

// =====================================================
// 新增隊員 → 寫入 personal sheet（複製同隊公式）
// =====================================================

function addPlayerToPersonalSheet(teamName, playerName) {
  var ss = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
  var sheet = ss.getSheetByName('personal');
  if (!sheet) { throw new Error('找不到 personal 頁籤'); }

  var lastRow = sheet.getLastRow();
  var allData = sheet.getRange(1, 1, lastRow, 2).getValues();

  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][0]).trim() === teamName && String(allData[i][1]).trim() === playerName) {
      Logger.log('⚠️ personal sheet 已存在: ' + teamName + ' / ' + playerName);
      return;
    }
  }

  var lastTeamRow = -1;
  for (var j = 1; j < allData.length; j++) {
    if (String(allData[j][0]).trim() === teamName) {
      lastTeamRow = j + 1;
    }
  }

  if (lastTeamRow === -1) {
    Logger.log('⚠️ personal sheet 找不到隊伍: ' + teamName + '，新增在最末行');
    sheet.getRange(lastRow + 1, 1).setValue(teamName);
    sheet.getRange(lastRow + 1, 2).setValue(playerName);
    return;
  }

  sheet.insertRowAfter(lastTeamRow);
  var newRow = lastTeamRow + 1;

  sheet.getRange(newRow, 1).setValue(teamName);
  sheet.getRange(newRow, 2).setValue(playerName);

  // 複製公式（C~M 欄，共 11 欄）
  sheet.getRange(lastTeamRow, 3, 1, 11).copyTo(sheet.getRange(newRow, 3, 1, 11));

  Logger.log('✅ personal sheet 新增: ' + teamName + ' / ' + playerName + ' (row ' + newRow + ')');
}

// =====================================================
// 刪除隊員 → 從 personal sheet 移除
// =====================================================

function removePlayerFromPersonalSheet(teamName, playerName) {
  var ss = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
  var sheet = ss.getSheetByName('personal');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  var allData = sheet.getRange(1, 1, lastRow, 2).getValues();

  for (var i = allData.length - 1; i >= 1; i--) {
    var t = String(allData[i][0]).trim();
    var n = String(allData[i][1]).trim();
    if ((!teamName || t === teamName) && (n === playerName || n === '曾朋人' || n === '增朋人')) {
      sheet.deleteRow(i + 1);
      Logger.log('🗑️ 已從 personal sheet 刪除: ' + t + ' / ' + n + ' (row ' + (i + 1) + ')');
    }
  }
}

function getSeasonFromGameId(gameId) {
  return 'season7';
}
