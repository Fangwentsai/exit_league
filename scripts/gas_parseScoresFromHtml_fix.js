// =====================================================
// 修正版 parseScoresFromHtml
// 貼上去直接整個取代 Code.gs 裡原本那份 parseScoresFromHtml（連同上面
// 的註解區塊「1. 解析 HTML 比分 + 飲酒加成 + 和局 (L, M 欄)」一起換掉即可）。
//
// 背景：js/preview_generator.js 最近改成新版型渲染（HTML 裡不再寫死
// <div class="team-name">／<div class="team-score">，分數改成瀏覽器載入
// 後用 renderMatchResult() 從 matchMeta + 逐局資料現算），導致這支函式
// 原本靠 regex 抓 team-score 的寫法完全抓不到東西，schedule 的 D/F 欄
// 從上週切換版型後就沒再寫入過。
//
// 修法：新版型優先，從 matchMeta + drinkingBonus + 逐局 matches 陣列
// 自己重算一次分數（權重規則跟 js/game_result.js 的
// calculateMatchScore 完全一致：1,2,3,4,6,7,8,9 set = 1分，
// 11,12,13,14 = 2分，5,10 = 3分，15,16 = 4分，勝隊加1分，
// 再加飲酒加成）；抓不到 matchMeta 就當作舊版型，照原本的
// team-name/team-score regex 解析，兩種檔案都吃得下。
//
// 已經用本機 g34.html（30:6）、g36.html（19:17）這兩筆真實資料驗算過，
// 算出來的分數跟 schedule 裡已經記錄的正確答案完全一致。
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
