// =====================================================
// Admin GAS — 完整版 Code.gs
// 功能：比賽上傳 + GitHub push + 自動排行榜 + 6場偵測
// =====================================================

var WEEKLY_SHEET_ID = '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM';
var NOTIFY_EMAIL = 'fangwentsai14@gmail.com';
var GAMES_PER_WEEK = 6;
// Vercel 設定從 Script Properties 讀取
// 需要在 GAS「專案設定 → 指令碼屬性」設定：
//   VERCEL_DEPLOY_HOOK, VERCEL_TOKEN, VERCEL_PROJECT_ID

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
    
    // 2. 上傳到 GitHub（可選，需要 Script Properties 設定 GITHUB_TOKEN）
    let githubResult = null;
    if (data.htmlContent && data.gameId) {
      try {
        const season = getSeasonFromGameId(data.gameId) || 'season6';
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
    
    // 3. 【自動化】寫入排行榜 + 選手數據 + 偵測6場完成（不管 GitHub 上傳成不成功都要執行）
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
// Vercel 自動部署
// =====================================================

function triggerVercelDeploy() {
  try {
    var props = PropertiesService.getScriptProperties();
    var deployHook = props.getProperty('VERCEL_DEPLOY_HOOK');
    var vercelToken = props.getProperty('VERCEL_TOKEN');
    var projectId = props.getProperty('VERCEL_PROJECT_ID');
    
    if (!deployHook || !vercelToken || !projectId) {
      Logger.log('⚠️ Vercel 設定不完整，跳過自動部署');
      return;
    }
    
    // 1. 觸發 Deploy Hook 建立部署
    var hookRes = UrlFetchApp.fetch(deployHook, { method: 'POST', muteHttpExceptions: true });
    Logger.log('🚀 Deploy Hook 觸發: ' + hookRes.getResponseCode());
    
    // 2. 等 20 秒讓部署完成（Hobby 方案通常 7-10 秒）
    Utilities.sleep(20000);
    
    // 3. 取得最新 READY 部署 ID
    var listRes = UrlFetchApp.fetch(
      'https://api.vercel.com/v6/deployments?projectId=' + projectId + '&limit=1&state=READY',
      { method: 'GET', headers: { 'Authorization': 'Bearer ' + vercelToken }, muteHttpExceptions: true }
    );
    var deployments = JSON.parse(listRes.getContentText());
    
    if (deployments.deployments && deployments.deployments.length > 0) {
      var deployId = deployments.deployments[0].uid;
      Logger.log('📦 最新部署: ' + deployId);
      
      // 4. 用 Alias API 設定為 Production（Hobby 方案不支援 Promote API）
      var aliases = ['exit-league-dev.vercel.app', 'yhdarts.com'];
      for (var i = 0; i < aliases.length; i++) {
        var aliasRes = UrlFetchApp.fetch(
          'https://api.vercel.com/v2/deployments/' + deployId + '/aliases',
          {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + vercelToken, 'Content-Type': 'application/json' },
            payload: JSON.stringify({ alias: aliases[i] }),
            muteHttpExceptions: true
          }
        );
        Logger.log('✅ Alias ' + aliases[i] + ': ' + aliasRes.getResponseCode());
      }
    } else {
      Logger.log('⚠️ 找不到 READY 狀態的部署');
    }
  } catch (e) {
    Logger.log('⚠️ Vercel 部署失敗: ' + e.toString());
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
    
    // 如果前端沒送 playerStats，從 HTML 自動解析
    if (!playerStats || (playerStats.away.length === 0 && playerStats.home.length === 0)) {
      playerStats = parsePlayerStatsFromHtml(data.htmlContent);
    }
    
    if (playerStats && (playerStats.away.length > 0 || playerStats.home.length > 0)) {
      writePlayerDataToSheet(ss, playerStats, awayTeam, homeTeam, data.gameDate || '');
      Logger.log('✅ 已寫入 data 頁籤選手數據');
    }
    
    // 等公式重算
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
  // 先把 A 欄設為文字格式，避免 "+0" 被轉成數字 0
  sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('@');
  sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);
  Logger.log('✅ data 頁籤：已追加 ' + rows.length + ' 列');
}

// =====================================================
// 解析 HTML 選手數據
// =====================================================

function parsePlayerStatsFromHtml(htmlContent) {
  try {
    // 取得 match data：const gXXXMatches = [...]
    var matchBlock = htmlContent.match(/const \w+Matches = \[([\s\S]*?)\];/);
    if (!matchBlock) { Logger.log('⚠️ 找不到 match data'); return null; }
    
    var matchStr = matchBlock[1];
    // 逐筆解析 {set:1, type:'01', away:'安安', home:'Mo', firstAttack:'home', winner:'home'}
    var matchRegex = /\{[^}]*type:\s*'(\w+)'[^}]*away:\s*(\[[^\]]*\]|'[^']*')[^}]*home:\s*(\[[^\]]*\]|'[^']*')[^}]*firstAttack:\s*'(\w+)'[^}]*winner:\s*'(\w+)'/g;
    var m;
    var stats = {};
    
    while ((m = matchRegex.exec(matchStr)) !== null) {
      var type = m[1]; // '01' or 'CR'
      var awayRaw = m[2];
      var homeRaw = m[3];
      var firstAttack = m[4];
      var winner = m[5];
      
      // 解析選手名（可能是 '名字' 或 ['名1','名2','名3']）
      var awayPlayers = parsePlayerNames(awayRaw);
      var homePlayers = parsePlayerNames(homeRaw);
      
      // 統計
      processPlayers(stats, awayPlayers, 'away', type, firstAttack, winner);
      processPlayers(stats, homePlayers, 'home', type, firstAttack, winner);
    }
    
    // 分成 away/home 陣列
    var awayStats = []; var homeStats = [];
    for (var key in stats) {
      var s = stats[key];
      var row = { name: s.name, p01: s.p01, w01: s.w01, pCR: s.pCR, wCR: s.wCR, total: s.total, wins: s.wins, fa: s.fa };
      if (s.side === 'away') awayStats.push(row);
      else homeStats.push(row);
    }
    
    if (awayStats.length === 0 && homeStats.length === 0) return null;
    Logger.log('📊 解析選手: away=' + awayStats.length + ' home=' + homeStats.length);
    return { away: awayStats, home: homeStats };
  } catch (e) {
    Logger.log('❌ parsePlayerStatsFromHtml 錯誤: ' + e.toString());
    return null;
  }
}

function parsePlayerNames(raw) {
  raw = raw.trim();
  if (raw.charAt(0) === '[') {
    // 陣列格式 ['名1', '名2']
    var names = [];
    var nameRegex = /'([^']+)'/g;
    var nm;
    while ((nm = nameRegex.exec(raw)) !== null) { names.push(nm[1]); }
    return names;
  } else {
    // 單人格式 '名字'
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
// 解析 HTML 比分 + 寫入 schedule
// =====================================================

function parseScoresFromHtml(htmlContent, gameCode) {
  try {
    var awayMatch = htmlContent.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
    var homeMatch = htmlContent.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
    var scoreMatches = htmlContent.match(/<div class="team-score">(\d+)<\/div>/g);
    var venueMatch = htmlContent.match(/<div class="venue-info">(.*?)<\/div>/);
    
    if (!awayMatch || !homeMatch || !scoreMatches || scoreMatches.length < 2) {
      Logger.log('⚠️ 無法解析 HTML 比分: ' + gameCode);
      return null;
    }
    
    var awayTeam = awayMatch[1].trim();
    var homeTeam = homeMatch[1].trim();
    var awayScore = parseInt(scoreMatches[0].match(/(\d+)/)[1]);
    var homeScore = parseInt(scoreMatches[1].match(/(\d+)/)[1]);
    var venue = venueMatch ? venueMatch[1].trim() : '';
    var winner = awayScore > homeScore ? awayTeam : (homeScore > awayScore ? homeTeam : '');
    var loser = awayScore > homeScore ? homeTeam : (homeScore > awayScore ? awayTeam : '');
    var draw = awayScore === homeScore ? 'Y' : '';
    
    // 解析飲酒加成
    var drunkTeam = '';
    var drinkMatch = htmlContent.match(/const drinkingBonus\s*=\s*\{\s*away:\s*(\d+),\s*home:\s*(\d+)\s*\}/);
    if (drinkMatch) {
      var awayBonus = parseInt(drinkMatch[1]);
      var homeBonus = parseInt(drinkMatch[2]);
      if (awayBonus > 0) drunkTeam = awayTeam;
      if (homeBonus > 0) drunkTeam = homeTeam;
    }
    
    return { gId: gameCode.toUpperCase(), awayTeam: awayTeam, awayScore: awayScore, homeScore: homeScore, homeTeam: homeTeam, venue: venue, winner: winner, loser: loser, draw: draw, drunkTeam: drunkTeam };
  } catch (e) {
    Logger.log('❌ parseScoresFromHtml 錯誤: ' + e.toString());
    return null;
  }
}

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
  
  sheet.getRange(targetRow, 4).setValue(gameData.awayScore);
  sheet.getRange(targetRow, 6).setValue(gameData.homeScore);
  if (gameData.venue) { sheet.getRange(targetRow, 8).setValue(gameData.venue); }
  sheet.getRange(targetRow, 9).setValue(gameData.winner);
  sheet.getRange(targetRow, 10).setValue(gameData.loser);
  sheet.getRange(targetRow, 11).setValue(gameData.drunkTeam || '');  // K = 酒（飲酒加成隊伍）
  sheet.getRange(targetRow, 12).setValue(gameData.draw || '');       // L = 和局
  
  Logger.log('✅ schedule 已更新: ' + gameData.gId + ' → ' + gameData.awayTeam + ' ' + gameData.awayScore + ':' + gameData.homeScore + ' ' + gameData.homeTeam);
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
    
    // 個人勝場 Top 5：G欄降序，同分按H欄勝率降序
    var playerTop5 = allPlayers
      .map(function(r) { return { team: r[0], name: r[1], wins: parseInt(r[6]) || 0, winRate: r[7] || '0%' }; })
      .sort(function(a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (parseFloat(String(b.winRate).replace('%', '')) || 0) - (parseFloat(String(a.winRate).replace('%', '')) || 0);
      })
      .slice(0, 5);
    
    // Top Lady：N欄=女，G欄降序
    var topLadies = allPlayers
      .filter(function(r) { return String(r[13]).trim() === '女'; })
      .map(function(r) { return { team: r[0], name: r[1], wins: parseInt(r[6]) || 0 }; })
      .sort(function(a, b) { return b.wins - a.wins; })
      .slice(0, 5);
    
    // 地獄倒霉鬼：M>0排除DNP，I欄先攻率升序
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
          // 原始小數（如 0.2142...）→ 轉成百分比
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
      return '                    <tr><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.wins + '</td></tr>';
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
      return '                    <tr><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.faRate + '</td></tr>';
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
    
    Logger.log('📊 進度: ' + completedGames.length + '/' + GAMES_PER_WEEK + ' (G' + weekStart + '~G' + weekEnd + ')');
    
    if (completedGames.length === GAMES_PER_WEEK && missingGames.length === 0) {
      MailApp.sendEmail(NOTIFY_EMAIL,
        '🎯 本週 ' + GAMES_PER_WEEK + ' 場比賽全部完成！G' + weekStart + '~G' + weekEnd,
        '排行榜已自動更新到 yhdarts.com。\n\n完成場次：' + completedGames.join(', ') + '\n\n請告訴 AI「寫戰報」來生成本週的戰報新聞。\n\n— 難找的聯賽自動化系統'
      );
      Logger.log('📧 已寄送完成通知到 ' + NOTIFY_EMAIL);

      // 自動生成戰報
      try {
        generateAndPublishReport(ss, weekStart, weekEnd);
      } catch (reportErr) {
        Logger.log('❌ 戰報生成失敗: ' + reportErr.toString());
      }
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
    if (targetRowIndex === -1) { Logger.log('找不到 ' + match.gId); return; }

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
    
    // 檢查檔案是否存在
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
// 戰報自動生成系統
// =====================================================

var BATTLE_REPORT_SYSTEM_PROMPT = '你是「難找的聯賽」飛鏢聯賽的週報戰報撰寫員。你的任務是根據本週比賽數據撰寫一篇戰報。\n\n'
  + '## 風格要求（最重要！）\n'
  + '- 口語化、接地氣：像朋友在聊天，不是新聞稿\n'
  + '- 有梗有態度：會吐槽、會開玩笑、幫隊伍加戲\n'
  + '- 數據用故事帶出：不要硬列數字，用對比和情緒包裝\n'
  + '- 比分解讀帶情緒：例如「2分？！是不是我看錯了？沒有。是 2。兩個。Deux。」\n'
  + '- 地獄倒霉鬼段落要有同理心和幽默\n'
  + '- 結尾可以加生活梗或時事梗\n\n'
  + '## 絕對禁止\n'
  + '- ❌ 不要用「各位選手與飛鏢同好們」這種制式開場\n'
  + '- ❌ 不要用「讓我們一起來看看」「精彩絕倫」「不負眾望」這種廢話\n'
  + '- ❌ 不要輕易的講到「白熱化」\n'
  + '- ❌ 不要像 ChatGPT 寫作文，要像人在講話\n'
  + '- ❌ 不要用 markdown 格式，直接輸出 HTML 內文\n'
  + '- ❌ 不要加「※ 本新聞由 AI 協助撰寫」\n\n'
  + '## 必要段落（依序）\n'
  + '1. 開場白：口語化切入，可以用本週最大亮點破題\n'
  + '2. 🔥/⚔️/🏆 本週戰況：6 場比賽逐場帶過，重點比賽多著墨（大比分差、爆冷、關鍵對決），用 1-2 句話帶過普通場次\n'
  + '3. 📊 團隊排行：highlight 排名變動、分數追平/超車、領先差距變化\n'
  + '4. 👑 個人勝場榜：Top 5，講超車、接近、或拉開差距的故事\n'
  + '5. 🌹 Top Lady：女選手勝場前 5，講排名變動\n'
  + '6. 💀 地獄倒霉鬼：先攻率最低 5 人，用同理心和幽默帶出\n'
  + '7. 📅 下週預告：列出下週 6 場對戰組合\n'
  + '8. 總結：一句話收尾，用 <em> 斜體包起來\n\n'
  + '## HTML 格式規則\n'
  + '- 用 <strong>emoji 小標題</strong> 開每個段落\n'
  + '- 段落之間用 <br><br> 換段\n'
  + '- 結尾總結用 <em>總結文字</em>\n'
  + '- 不要加 <div>、<p> 或其他區塊標籤，只用 <strong>、<em>、<br>\n'
  + '- 輸出的是 news-text 裡面的內文，不需要外層的 HTML 結構';

/**
 * 收集本週比賽數據
 * @param {Spreadsheet} ss - 試算表物件
 * @param {number} weekStart - 本週起始場次 (e.g. 1)
 * @param {number} weekEnd - 本週結束場次 (e.g. 6)
 * @returns {Object} 結構化的週數據
 */
function gatherWeeklyData(ss, weekStart, weekEnd) {
  try {
    var sheet = ss.getSheetByName('schedule');
    var lastRow = sheet.getLastRow();
    var allData = sheet.getRange(2, 1, lastRow - 1, 12).getValues();

    // 1. 本週 6 場比賽結果
    var weekGames = [];
    for (var g = weekStart; g <= weekEnd; g++) {
      var gId = 'G' + g;
      for (var i = 0; i < allData.length; i++) {
        if (String(allData[i][0]).trim().toUpperCase() === gId) {
          weekGames.push({
            gameId: gId,
            awayTeam: String(allData[i][2] || ''),
            awayScore: allData[i][3],
            homeScore: allData[i][5],
            homeTeam: String(allData[i][6] || ''),
            winner: String(allData[i][8] || ''),
            loser: String(allData[i][9] || ''),
            drinkingBonus: String(allData[i][10] || '')
          });
          break;
        }
      }
    }

    // 2. 目前排行榜
    var rankings = readRankingsFromSheets(ss);

    // 3. 下週賽程預告
    var nextWeekStart = weekEnd + 1;
    var nextWeekEnd = weekEnd + GAMES_PER_WEEK;
    var nextWeekGames = [];
    for (var ng = nextWeekStart; ng <= nextWeekEnd; ng++) {
      var nId = 'G' + ng;
      for (var j = 0; j < allData.length; j++) {
        if (String(allData[j][0]).trim().toUpperCase() === nId) {
          nextWeekGames.push({
            gameId: nId,
            awayTeam: String(allData[j][2] || ''),
            homeTeam: String(allData[j][6] || '')
          });
          break;
        }
      }
    }

    Logger.log('📦 gatherWeeklyData: ' + weekGames.length + ' 場比賽, 下週 ' + nextWeekGames.length + ' 場');
    return {
      weekStart: weekStart,
      weekEnd: weekEnd,
      games: weekGames,
      rankings: rankings,
      nextWeek: nextWeekGames
    };
  } catch (e) {
    Logger.log('❌ gatherWeeklyData 錯誤: ' + e.toString());
    throw e;
  }
}

/**
 * 呼叫 Gemini API 生成戰報
 * @param {Object} weeklyData - gatherWeeklyData 回傳的結構化數據
 * @returns {string} 生成的 HTML 戰報內文
 */
function generateBattleReport(weeklyData) {
  try {
    var props = PropertiesService.getScriptProperties();
    var apiKey = props.getProperty('GEMINI_API_KEY');
    var model = props.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('未設定 GEMINI_API_KEY，請在 Script Properties 中設定');
    }

    // 組裝 user prompt
    var userPrompt = '以下是本週 G' + weeklyData.weekStart + '~G' + weeklyData.weekEnd + ' 的比賽數據：\n\n';

    // 本週比賽結果
    userPrompt += '## 本週比賽結果\n';
    for (var i = 0; i < weeklyData.games.length; i++) {
      var game = weeklyData.games[i];
      userPrompt += game.gameId + ': ' + game.awayTeam + ' ' + game.awayScore + ':' + game.homeScore + ' ' + game.homeTeam;
      userPrompt += ' → 勝：' + game.winner;
      if (game.drinkingBonus) {
        userPrompt += '（飲酒加成：' + game.drinkingBonus + '）';
      }
      userPrompt += '\n';
    }

    // 團隊排行
    if (weeklyData.rankings && weeklyData.rankings.teams) {
      userPrompt += '\n## 團隊排行\n';
      for (var t = 0; t < weeklyData.rankings.teams.length; t++) {
        var team = weeklyData.rankings.teams[t];
        userPrompt += (t + 1) + '. ' + team[0] + ' ' + team[1] + ' 總分：' + Math.round(parseFloat(team[2]) || 0) + '\n';
      }
    }

    // 個人勝場 Top 5
    if (weeklyData.rankings && weeklyData.rankings.players) {
      userPrompt += '\n## 個人勝場 Top 5\n';
      for (var p = 0; p < weeklyData.rankings.players.length; p++) {
        var player = weeklyData.rankings.players[p];
        userPrompt += (p + 1) + '. ' + player.name + '（' + player.team + '）' + player.wins + ' 勝 ' + player.winRate + '\n';
      }
    }

    // Top Lady
    if (weeklyData.rankings && weeklyData.rankings.ladies) {
      userPrompt += '\n## Top Lady\n';
      for (var l = 0; l < weeklyData.rankings.ladies.length; l++) {
        var lady = weeklyData.rankings.ladies[l];
        userPrompt += (l + 1) + '. ' + lady.name + '（' + lady.team + '）' + lady.wins + ' 勝\n';
      }
    }

    // 地獄倒霉鬼
    if (weeklyData.rankings && weeklyData.rankings.unlucky) {
      userPrompt += '\n## 地獄倒霉鬼（先攻率最低）\n';
      for (var u = 0; u < weeklyData.rankings.unlucky.length; u++) {
        var unlucky = weeklyData.rankings.unlucky[u];
        userPrompt += (u + 1) + '. ' + unlucky.name + '（' + unlucky.team + '）先攻率：' + unlucky.faRate + '\n';
      }
    }

    // 下週預告
    if (weeklyData.nextWeek && weeklyData.nextWeek.length > 0) {
      userPrompt += '\n## 下週賽程\n';
      for (var n = 0; n < weeklyData.nextWeek.length; n++) {
        var next = weeklyData.nextWeek[n];
        userPrompt += next.gameId + ': ' + next.awayTeam + ' vs ' + next.homeTeam + '\n';
      }
    }

    Logger.log('🤖 呼叫 Gemini API (' + model + ')...');
    Logger.log('📝 User prompt 長度: ' + userPrompt.length);

    // 呼叫 Gemini API
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    var payload = {
      contents: [{
        role: 'user',
        parts: [{ text: BATTLE_REPORT_SYSTEM_PROMPT + '\n\n' + userPrompt }]
      }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 4096
      }
    };

    var response = UrlFetchApp.fetch(url, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var responseCode = response.getResponseCode();
    Logger.log('🤖 Gemini API 回應: ' + responseCode);

    if (responseCode !== 200) {
      throw new Error('Gemini API 錯誤: ' + responseCode + ' - ' + response.getContentText().substring(0, 300));
    }

    var result = JSON.parse(response.getContentText());
    var generatedText = result.candidates[0].content.parts[0].text;

    Logger.log('✅ 戰報生成成功，長度: ' + generatedText.length);
    return generatedText;
  } catch (e) {
    Logger.log('❌ generateBattleReport 錯誤: ' + e.toString());
    throw e;
  }
}

/**
 * 將戰報插入 news.html 並推送到 GitHub
 * @param {string} reportText - 生成的戰報 HTML 內文
 * @param {number} weekStart - 本週起始場次
 * @param {number} weekEnd - 本週結束場次
 */
function insertReportToNewsHtml(reportText, weekStart, weekEnd) {
  try {
    var newsFile = getFileFromGitHub('pages/news.html');
    var html = newsFile.content;

    // 收合目前展開的新聞項目
    html = html.replace('news-header expanded', 'news-header');
    html = html.replace('news-text expanded', 'news-text collapsed');

    // 今天日期 YYYY/M/D（不補零）
    var now = new Date();
    var dateStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();

    // 建立新聞區塊
    var newBlock = '\n            <div class="news-item collapsible">\n'
      + '                <div class="news-header expanded">\n'
      + '                    <div class="news-date">' + dateStr + '</div>\n'
      + '                    <div class="news-title">🎯 G' + weekStart + '~G' + weekEnd + ' 週報</div>\n'
      + '                </div>\n'
      + '                <div class="news-text expanded">\n'
      + '                    ' + reportText + '\n'
      + '                </div>\n'
      + '            </div>';

    // 插入到 news-section 之後
    var insertIndex = html.indexOf('id="news-section"');
    if (insertIndex === -1) {
      throw new Error('找不到 id="news-section"');
    }
    // 找到該行結尾的 >
    var closingBracket = html.indexOf('>', insertIndex);
    if (closingBracket === -1) {
      throw new Error('news-section 標籤格式異常');
    }
    html = html.substring(0, closingBracket + 1) + newBlock + html.substring(closingBracket + 1);

    // 推送到 GitHub
    var commitMessage = '📰 新增 G' + weekStart + '~G' + weekEnd + ' 週報戰報';
    uploadFileToGitHub('pages/news.html', html, commitMessage);
    Logger.log('✅ 戰報已插入 news.html 並推送到 GitHub');
  } catch (e) {
    Logger.log('❌ insertReportToNewsHtml 錯誤: ' + e.toString());
    throw e;
  }
}

/**
 * 戰報生成與發布主流程
 * @param {Spreadsheet} ss - 試算表物件
 * @param {number} weekStart - 本週起始場次
 * @param {number} weekEnd - 本週結束場次
 */
function generateAndPublishReport(ss, weekStart, weekEnd) {
  try {
    Logger.log('🚀 開始生成 G' + weekStart + '~G' + weekEnd + ' 戰報...');

    // 1. 收集數據
    var weeklyData = gatherWeeklyData(ss, weekStart, weekEnd);

    // 2. 呼叫 Gemini 生成戰報
    var reportText = generateBattleReport(weeklyData);

    // 3. 插入 news.html 並推送 GitHub
    insertReportToNewsHtml(reportText, weekStart, weekEnd);

    // 4. 觸發 Vercel 部署
    triggerVercelDeploy();

    // 5. 寄送戰報預覽 email
    try {
      MailApp.sendEmail(NOTIFY_EMAIL,
        '📰 G' + weekStart + '~G' + weekEnd + ' 戰報已自動生成並上線',
        '戰報已自動發布到 yhdarts.com/pages/news.html\n\n'
        + '--- 戰報預覽 ---\n\n'
        + reportText.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
        + '\n\n— 難找的聯賽自動化系統'
      );
      Logger.log('📧 戰報預覽 email 已寄出');
    } catch (mailErr) {
      Logger.log('⚠️ 戰報 email 寄送失敗: ' + mailErr.toString());
    }

    Logger.log('✅ G' + weekStart + '~G' + weekEnd + ' 戰報流程完成！');
  } catch (e) {
    Logger.log('❌ generateAndPublishReport 錯誤: ' + e.toString());
    throw e;
  }
}

// =====================================================
// 工具函數
// =====================================================

function getSeasonFromGameId(gameId) {
  return 'season6';
}
