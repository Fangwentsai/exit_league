// =====================================================
// Phase 1~3：比賽上傳後自動更新排行榜 + 偵測 6 場完成
// =====================================================
// 貼到 Code.gs 的最底部（不要覆蓋現有的 doPost 等函數）
// 然後修改 doPost 加入呼叫（見底部說明）
// =====================================================

var WEEKLY_SHEET_ID = '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM';
var NOTIFY_EMAIL = 'fangwentsai14@gmail.com';
var GAMES_PER_WEEK = 6;

/**
 * 主控：比賽上傳後的自動化流程
 * 在 doPost 上傳 GitHub 成功後呼叫此函數
 * @param {Object} data - 前端傳來的完整資料（含 playerStats, scores, htmlContent 等）
 */
function afterGameUpload(data) {
  try {
    var ss = SpreadsheetApp.openById(WEEKLY_SHEET_ID);
    var gameCode = data.gameId || '';
    var gameNum = parseInt(gameCode.replace(/\D/g, ''));
    
    // Phase 1a: 解析 HTML 比分 → 寫入 schedule
    var gameScores = parseScoresFromHtml(data.htmlContent, gameCode);
    if (gameScores) {
      writeGameToSchedule(ss, gameScores);
      Logger.log('✅ Phase 1a: 已寫入 schedule - ' + gameScores.gId);
    }
    
    // Phase 1b: 寫入選手數據到 data 頁籤
    if (data.playerStats && (data.playerStats.away.length > 0 || data.playerStats.home.length > 0)) {
      var gameDate = data.gameDate || '';
      writePlayerDataToSheet(ss, data.playerStats, data.awayTeam, data.homeTeam, gameDate);
      Logger.log('✅ Phase 1b: 已寫入 data 頁籤選手數據');
    }
    
    // 等一下讓 Google Sheets 公式重算
    SpreadsheetApp.flush();
    
    // Phase 2: 讀取排行榜 → 更新 news.html → push GitHub
    var rankings = readRankingsFromSheets(ss);
    if (rankings) {
      updateAndPushNewsHtml(rankings);
      Logger.log('✅ Phase 2: 已更新 news.html 排行榜');
    }
    
    // Phase 3: 檢查本週 6 場是否全部完成
    checkWeekComplete(ss, gameNum);
    
  } catch (error) {
    Logger.log('❌ afterGameUpload 錯誤: ' + error.toString());
    // 不影響主流程，只記錄錯誤
  }
}

/**
 * 寫入選手數據到 data 頁籤（personal 的公式靠這裡）
 * 格式和 weekly_update.js 的 appendToDataSheet 一致
 */
function writePlayerDataToSheet(ss, playerStats, awayTeam, homeTeam, gameDate) {
  var sheet = ss.getSheetByName('data');
  if (!sheet) { Logger.log('找不到 data 頁籤'); return; }
  
  var lastRow = sheet.getLastRow();
  var rows = [];
  
  // 空一列分隔
  if (lastRow >= 1) {
    rows.push(['', '', '', '', '', '', '', '']);
  }
  
  // 日期 header
  rows.push([gameDate, '', '', '', '', '', '', '']);
  
  // 客場選手
  if (playerStats.away && playerStats.away.length > 0) {
    rows.push(['【' + awayTeam + '】選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數']);
    playerStats.away.forEach(function(p) {
      rows.push([p.name, p.p01, p.w01, p.pCR, p.wCR, p.total, p.wins, p.fa]);
    });
  }
  
  // 主場選手
  if (playerStats.home && playerStats.home.length > 0) {
    rows.push(['【' + homeTeam + '】選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數']);
    playerStats.home.forEach(function(p) {
      rows.push([p.name, p.p01, p.w01, p.pCR, p.wCR, p.total, p.wins, p.fa]);
    });
  }
  
  if (rows.length === 0) return;
  
  // 批次寫入
  var startRow = lastRow + 1;
  sheet.getRange(startRow, 1, rows.length, 8).setValues(rows);
  Logger.log('✅ data 頁籤：已追加 ' + rows.length + ' 列（從第 ' + startRow + ' 列）');
}

// =====================================================
// Phase 1: 解析 HTML 比分 + 寫入 schedule
// =====================================================

/**
 * 從 HTML 解析比分和基本資料
 */
function parseScoresFromHtml(htmlContent, gameCode) {
  try {
    // 隊名
    var awayMatch = htmlContent.match(/<div class="team away">\s*<div class="team-name">(.*?)<\/div>/);
    var homeMatch = htmlContent.match(/<div class="team home">[\s\S]*?<div class="team-name">(.*?)<\/div>/);
    
    // 分數
    var scoreMatches = htmlContent.match(/<div class="team-score">(\d+)<\/div>/g);
    
    // 場地
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
    
    // 判斷勝負
    var winner = awayScore > homeScore ? awayTeam : (homeScore > awayScore ? homeTeam : '');
    var loser = awayScore > homeScore ? homeTeam : (homeScore > awayScore ? awayTeam : '');
    var draw = awayScore === homeScore ? 'Y' : '';
    
    return {
      gId: gameCode.toUpperCase(),
      awayTeam: awayTeam,
      awayScore: awayScore,
      homeScore: homeScore,
      homeTeam: homeTeam,
      venue: venue,
      winner: winner,
      loser: loser,
      draw: draw
    };
  } catch (e) {
    Logger.log('❌ parseScoresFromHtml 錯誤: ' + e.toString());
    return null;
  }
}

/**
 * 寫入 schedule 頁籤
 * 找到 gId 對應的列，填入 D(客場分)、F(主場分)、H(場地)、I(勝)、J(敗)
 */
function writeGameToSchedule(ss, gameData) {
  var sheet = ss.getSheetByName('schedule');
  if (!sheet) { Logger.log('找不到 schedule 頁籤'); return; }
  
  var lastRow = sheet.getLastRow();
  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // A欄 = gId
  
  var targetRow = -1;
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).trim().toUpperCase() === gameData.gId.toUpperCase()) {
      targetRow = i + 2;
      break;
    }
  }
  
  if (targetRow === -1) {
    Logger.log('⚠️ schedule 找不到 ' + gameData.gId + ' 的列');
    return;
  }
  
  sheet.getRange(targetRow, 4).setValue(gameData.awayScore);  // D = 客場分
  sheet.getRange(targetRow, 6).setValue(gameData.homeScore);  // F = 主場分
  if (gameData.venue) {
    sheet.getRange(targetRow, 8).setValue(gameData.venue);    // H = 場地
  }
  sheet.getRange(targetRow, 9).setValue(gameData.winner);     // I = 勝
  sheet.getRange(targetRow, 10).setValue(gameData.loser);     // J = 敗
  
  // K = 和局
  var maxCols = sheet.getLastColumn();
  if (maxCols >= 12) {
    sheet.getRange(targetRow, 12).setValue(gameData.draw);
  }
  
  Logger.log('✅ schedule 已更新: ' + gameData.gId + ' → ' + 
    gameData.awayTeam + ' ' + gameData.awayScore + ':' + gameData.homeScore + ' ' + gameData.homeTeam);
}

// =====================================================
// Phase 2: 讀取排行榜 + 更新 news.html + push GitHub
// =====================================================

/**
 * 從 Google Sheets 讀取四個排行榜
 */
function readRankingsFromSheets(ss) {
  try {
    // 團隊排行：schedule!X2:Z13
    var teamSheet = ss.getSheetByName('schedule');
    var teamData = teamSheet.getRange('X2:Z13').getValues()
      .filter(function(r) { return r[1] && r[2]; });
    
    // 讀取 personal 全部資料
    var personalSheet = ss.getSheetByName('personal');
    var allPlayers = personalSheet.getRange('A2:N' + personalSheet.getLastRow()).getValues()
      .filter(function(r) { return r[0] && r[1]; }); // 有隊伍和姓名
    
    // 個人勝場 Top 5：按 G欄(index 6) 降序，同分按 H欄(index 7) 降序
    var playerTop5 = allPlayers
      .map(function(r) { 
        return { team: r[0], name: r[1], wins: parseInt(r[6]) || 0, winRate: r[7] || '0%' }; 
      })
      .sort(function(a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        var rateA = parseFloat(String(a.winRate).replace('%', '')) || 0;
        var rateB = parseFloat(String(b.winRate).replace('%', '')) || 0;
        return rateB - rateA;
      })
      .slice(0, 5);
    
    // Top Lady Top 5：N欄(index 13) = '女'，按 G欄(index 6) 降序
    var topLadies = allPlayers
      .filter(function(r) { return String(r[13]).trim() === '女'; })
      .map(function(r) {
        return { team: r[0], name: r[1], wins: parseInt(r[6]) || 0 };
      })
      .sort(function(a, b) { return b.wins - a.wins; })
      .slice(0, 5);
    
    // 地獄倒霉鬼 Top 5：M欄(index 12) > 0（排除DNP），按 I欄(index 8) 升序
    var unlucky = allPlayers
      .filter(function(r) { 
        var totalGames = parseInt(r[12]) || 0;
        var faRate = String(r[8]).trim();
        return totalGames > 0 && faRate && faRate !== '0%' && faRate !== '';
      })
      .map(function(r) {
        return { 
          team: r[0], name: r[1], 
          faRate: r[8],
          faRateNum: parseFloat(String(r[8]).replace('%', '')) || 100
        };
      })
      .sort(function(a, b) { return a.faRateNum - b.faRateNum; })
      .slice(0, 5);
    
    return {
      teams: teamData,
      players: playerTop5,
      ladies: topLadies,
      unlucky: unlucky
    };
  } catch (e) {
    Logger.log('❌ readRankingsFromSheets 錯誤: ' + e.toString());
    return null;
  }
}

/**
 * 從 GitHub 讀取檔案內容
 */
function getFileFromGitHub(filePath) {
  var properties = PropertiesService.getScriptProperties();
  var token = properties.getProperty('GITHUB_TOKEN');
  var repoOwner = properties.getProperty('GITHUB_REPO_OWNER');
  var repoName = properties.getProperty('GITHUB_REPO_NAME');
  var branch = properties.getProperty('GITHUB_BRANCH') || 'main';
  
  var apiUrl = 'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/' + filePath + '?ref=' + branch;
  
  var response = UrlFetchApp.fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Google-Apps-Script'
    },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error('GitHub 讀取失敗: ' + response.getResponseCode());
  }
  
  var fileData = JSON.parse(response.getContentText());
  // GitHub API 回傳 base64 內容
  var content = Utilities.newBlob(Utilities.base64Decode(fileData.content)).getDataAsString('UTF-8');
  return { content: content, sha: fileData.sha };
}

/**
 * 更新 news.html 排行榜並 push 到 GitHub
 */
function updateAndPushNewsHtml(rankings) {
  // 1. 從 GitHub 讀取現有 news.html
  var newsFile = getFileFromGitHub('pages/news.html');
  var html = newsFile.content;
  
  // 2. 替換團隊排行表
  if (rankings.teams.length > 0) {
    var teamRows = rankings.teams.map(function(t) {
      return '                    <tr><td>' + t[0] + '</td><td>' + t[1] + '</td><td>' + t[2] + '</td></tr>';
    }).join('\n');
    html = html.replace(
      /<th>總分<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
      '<th>總分</th>\n                    </tr>\n' + teamRows + '\n                </table>'
    );
  }
  
  // 3. 替換個人勝場表
  if (rankings.players.length > 0) {
    var playerRows = rankings.players.map(function(p) {
      return '                    <tr><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.wins + '</td></tr>';
    }).join('\n');
    html = html.replace(
      /<th>勝場數<\/th>\s*<\/tr>\s*<tr>\s*<td>[\s\S]*?<\/table>/,
      '<th>勝場數</th>\n                    </tr>\n' + playerRows + '\n                </table>'
    );
  }
  
  // 4. 替換 Top Lady 表
  if (rankings.ladies.length > 0) {
    var ladyRows = rankings.ladies.map(function(p) {
      return '                    <tr><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.wins + '</td></tr>';
    }).join('\n');
    html = html.replace(
      /<h3 class="section-title">Top Lady 🌹<\/h3>\s*<table class="ranking-table">[\s\S]*?<\/table>/,
      '<h3 class="section-title">Top Lady 🌹</h3>\n                <table class="ranking-table">\n                    <tr>\n                        <th>隊名</th>\n                        <th>姓名</th>\n                        <th>勝場數</th>\n                    </tr>\n' + ladyRows + '\n                </table>'
    );
  }
  
  // 5. 替換地獄倒霉鬼表
  if (rankings.unlucky.length > 0) {
    var unluckyRows = rankings.unlucky.map(function(p) {
      return '                    <tr><td>' + p.team + '</td><td>' + p.name + '</td><td>' + p.faRate + '</td></tr>';
    }).join('\n');
    html = html.replace(
      /<th>先攻機率<\/th>\s*<\/tr>[\s\S]*?<\/table>/,
      '<th>先攻機率</th>\n                    </tr>\n' + unluckyRows + '\n                </table>'
    );
  }
  
  // 6. Push 回 GitHub
  uploadFileToGitHub('pages/news.html', html, '📊 自動更新排行榜');
  Logger.log('✅ news.html 排行榜已更新並 push 到 GitHub');
}

// =====================================================
// Phase 3: 偵測 6 場完成 + email 通知
// =====================================================

/**
 * 檢查本週 6 場是否全部完成
 */
function checkWeekComplete(ss, currentGameNum) {
  try {
    // 計算當前週次範圍（每 6 場一組：1-6, 7-12, ..., 103-108）
    var weekStart = Math.floor((currentGameNum - 1) / GAMES_PER_WEEK) * GAMES_PER_WEEK + 1;
    var weekEnd = weekStart + GAMES_PER_WEEK - 1;
    
    var sheet = ss.getSheetByName('schedule');
    var lastRow = sheet.getLastRow();
    var allData = sheet.getRange(2, 1, lastRow - 1, 6).getValues(); // A~F
    
    var completedGames = [];
    var missingGames = [];
    
    for (var g = weekStart; g <= weekEnd; g++) {
      var gId = 'G' + g;
      var found = false;
      
      for (var i = 0; i < allData.length; i++) {
        if (String(allData[i][0]).trim().toUpperCase() === gId) {
          // 檢查 D欄(index 3) 有沒有分數
          if (allData[i][3] !== '' && allData[i][3] !== null && allData[i][3] !== undefined) {
            completedGames.push(gId);
          } else {
            missingGames.push(gId);
          }
          found = true;
          break;
        }
      }
      
      if (!found) {
        missingGames.push(gId);
      }
    }
    
    Logger.log('📊 本週進度: ' + completedGames.length + '/' + GAMES_PER_WEEK + 
      ' (G' + weekStart + '~G' + weekEnd + ')');
    
    if (completedGames.length === GAMES_PER_WEEK && missingGames.length === 0) {
      // 全部完成！寄信通知
      var subject = '🎯 本週 ' + GAMES_PER_WEEK + ' 場比賽全部完成！G' + weekStart + '~G' + weekEnd;
      var body = '排行榜已自動更新到 yhdarts.com。\n\n' +
        '完成場次：' + completedGames.join(', ') + '\n\n' +
        '請告訴 AI「寫戰報」來生成本週的戰報新聞。\n\n' +
        '— 難找的聯賽自動化系統';
      
      MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
      Logger.log('📧 已寄送完成通知到 ' + NOTIFY_EMAIL);
    } else {
      Logger.log('⏳ 還差 ' + missingGames.length + ' 場: ' + missingGames.join(', '));
    }
  } catch (e) {
    Logger.log('❌ checkWeekComplete 錯誤: ' + e.toString());
  }
}

// =====================================================
// doPost 修改說明
// =====================================================
// 在 Admin GAS（AKfycbw96zr... 那份）的 doPost 中，
// 找到 GitHub 上傳成功的地方，加入這一行：
//
//   afterGameUpload(data);
//
// 完整位置大約是：
//
//   if (githubResult.status === 'success') {
//     Logger.log('✅ GitHub 上傳成功: ' + filePath);
//     Logger.log('📄 文件 URL: ' + githubResult.fileUrl);
//     
//     // 【新增】自動更新排行榜 + 選手數據 + 偵測完成
//     afterGameUpload(data);
//   }
//
// =====================================================
