// 🎮 比賽結果預覽生成器
// 將 admin.html 的數據轉換為 game_result 格式的預覽

class GameResultPreviewGenerator {
    constructor() {
        this.gameTypes = {
            1: '501 (OI/MO)',
            2: '501 (DI/DO)',
            3: '701 (OI/MO)',
            4: '701 (OI/MO, 25/50)',
            5: '三人賽 701<br>每人一鏢骰子賽',
            6: 'Cricket',
            7: 'Cricket',
            8: 'HALF-IT',
            9: 'HALF-IT',
            10: '三人賽 Cricket<br>每人一鏢骰子賽',
            11: '701 雙人賽',
            12: '701 雙人賽 FREEZE',
            13: 'Cricket 雙人賽',
            14: 'Team Cricket',
            15: '四人賽 1101',
            16: '四人賽 Cricket'
        };

        this.sectionTitles = {
            individual: '個人賽 01',
            cricket: 'Cricket Games',
            doubles: '雙人賽',
            team: '四人賽'
        };
    }

    // 🎯 生成完整的 HTML 文件格式（用於保存到 Google Sheets）
    generateFullHTML(adminData) {
        const gameInfo = this.extractGameInfo(adminData);
        const matchData = this.convertToMatchData(adminData);
        const finalScores = this.calculateFinalScores(matchData, adminData.drinkingBonus || {});
        const awayPlayers = this.extractPlayers(adminData, 'away');
        const homePlayers = this.extractPlayers(adminData, 'home');

        // 生成 SEO 標籤
        const gameCode = gameInfo.gameCode.toUpperCase();
        const gameCodeLower = gameCode.toLowerCase();
        const season = this.getSeasonFromDate(gameInfo.date);
        const seasonNum = this.getSeasonNumber(gameInfo.date);
        const title = `難找的聯賽 ${season} ${gameCode} 賽果：${gameInfo.awayTeam} vs. ${gameInfo.homeTeam}｜飛鏢聯賽戰報`;
        const description = `查看 難找的聯賽 飛鏢${seasonNum}季 ${gameCode} 的詳細賽果。本場比賽由${gameInfo.awayTeam}對決${gameInfo.homeTeam}，包含 701 、 Cricket 與多人賽的完整數據分析與戰報。`;
        const keywords = `飛鏢聯賽, YHDARTS, 賽果, ${gameInfo.awayTeam}, ${gameInfo.homeTeam}, 飛鏢比賽, dart league, match result, phoenix darts, dartslive`;

        // 生成比賽數據的 JavaScript 對象（傳入 gameCode 確保變量名正確）
        const matchesJS = this.generateMatchesJS(matchData, gameCodeLower);
        const drinkingBonusJS = this.generateDrinkingBonusJS(adminData.drinkingBonus || {});
        const playersJS = this.generatePlayersJS(awayPlayers, homePlayers);

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
  
    <link rel="icon" href="../../images/favicon.ico" type="image/x-icon">
  
    <link rel="stylesheet" href="../../styles/common/game_result.css">
</head>
<body>
    <div class="container">
        <div class="match-info">
            <h2 class="match-date">${gameInfo.date}</h2>
            <div class="venue-info">${gameInfo.venue}</div>
            <div class="match-result">
                <div class="team away">
                    <div class="team-name">${gameInfo.awayTeam}</div>
                    <div class="team-score">${finalScores.away}</div>
                </div>
                <div class="score-divider">:</div>
                <div class="team home">
                    <div class="team-score">${finalScores.home}</div>
                    <div class="team-name">${gameInfo.homeTeam}</div>
                </div>
            </div>
        </div>

        <div class="score-details"><table class="score-table"></table></div>

        <div class="games-container">
            ${this.generateGameSections(matchData)}
          
            <div class="game-section">
                <h3>選手統計</h3>
                <div class="stats-buttons">
                    <button class="stats-btn active" data-team="away">客場選手</button>
                    <button class="stats-btn" data-team="home">主場選手</button>
                </div>
                <table class="game-table stats-table" id="awayStats">
                    <tr><th class="player-name">選手</th><th class="stat-cell">01出賽</th><th class="stat-cell">01勝場</th><th class="stat-cell">CR出賽</th><th class="stat-cell">CR勝場</th><th class="stat-cell">合計出賽</th><th class="stat-cell">合計勝場</th><th class="stat-cell">先攻數</th></tr>
                </table>
                <table class="game-table stats-table hidden" id="homeStats">
                    <tr><th class="player-name">選手</th><th class="stat-cell">01出賽</th><th class="stat-cell">01勝場</th><th class="stat-cell">CR出賽</th><th class="stat-cell">CR勝場</th><th class="stat-cell">合計出賽</th><th class="stat-cell">合計勝場</th><th class="stat-cell">先攻數</th></tr>
                </table>
            </div>
        </div>
    </div>

<script src="../../js/game_result.js"></script>
<script>
// ${gameCode} 比賽數據
${matchesJS}

// 飲酒加成
${drinkingBonusJS}

// 選手名單
${playersJS}

// 初始化
addMatchData(${gameCodeLower}Matches);
const scores = calculateFinalScore(${gameCodeLower}Matches, drinkingBonus);
updateScoreDisplay(scores);
initializeStats(awayPlayers, homePlayers);
</script>

<!-- Shopee 商品推廣 -->
<section class="shopee-game-carousel">
    <div style="display:flex;align-items:center;justify-content:space-between;">
        <div class="shopee-game-header" style="display:flex; align-items:center; gap: 4px;">
            <img src="../../images/aadarts.webp" alt="AA Darts">
            <div>【AA飛鏢專賣店】難找的補貨專區<br>官方蝦皮滿199店到店免運，聯賽感恩您</div>
        </div>
    </div>
    <div class="shopee-game-track-wrapper">
        <div class="shopee-game-track" id="shopee-game-track"></div>
    </div>
    <div class="shopee-game-dots" id="shopee-game-dots"></div>
</section>
<script src="../../js/shopee-carousel-game.js"></script>
</body>
</html>`;

        return html;
    }

    // 📝 生成比賽數據的 JavaScript 對象
    generateMatchesJS(matchData, gameCode = null) {
        if (!matchData || matchData.length === 0) {
            const code = gameCode || 'g00';
            return `const ${code}Matches = [];`;
        }

        const code = gameCode || matchData[0]?.gameCode || 'g00';
        const matchesArray = matchData.map(match => {
            // 處理 away 選手
            let away;
            if (Array.isArray(match.away)) {
                away = `[${match.away.map(p => `'${p}'`).join(', ')}]`;
            } else if (match.away) {
                away = `'${match.away}'`;
            } else {
                away = `''`;
            }

            // 處理 home 選手
            let home;
            if (Array.isArray(match.home)) {
                home = `[${match.home.map(p => `'${p}'`).join(', ')}]`;
            } else if (match.home) {
                home = `'${match.home}'`;
            } else {
                home = `''`;
            }

            return `    {set: ${match.set}, type: '${match.type}', away: ${away}, home: ${home}, firstAttack: '${match.firstAttack || ''}', winner: '${match.winner || ''}'}`;
        });

        return `const ${code}Matches = [\n${matchesArray.join(',\n')}\n];`;
    }

    // 🍺 生成飲酒加成的 JavaScript 對象
    generateDrinkingBonusJS(drinkingBonus) {
        return `const drinkingBonus = { away: ${drinkingBonus.away || 0}, home: ${drinkingBonus.home || 0} };`;
    }

    // 👥 生成選手名單的 JavaScript 對象
    generatePlayersJS(awayPlayers, homePlayers) {
        const awayPlayersStr = awayPlayers.map(p => `'${p}'`).join(', ');
        const homePlayersStr = homePlayers.map(p => `'${p}'`).join(', ');
        return `const awayPlayers = [${awayPlayersStr}];\nconst homePlayers = [${homePlayersStr}];`;
    }

    // 📅 從比賽日期獲取賽季
    getSeasonFromDate(dateStr) {
        // 將日期字串轉換為 Date 物件
        // 支援格式：2026/1/27 或 2026-1-27
        const parts = dateStr.replace(/-/g, '/').split('/');
        const gameDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const season6Start = new Date(2026, 0, 27); // 2026/1/27

        if (gameDate >= season6Start) {
            return '第六季';
        } else {
            return '第五季';
        }
    }

    // 📅 獲取賽季數字（用於 SEO 描述）
    getSeasonNumber(dateStr) {
        const parts = dateStr.replace(/-/g, '/').split('/');
        const gameDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const season6Start = new Date(2026, 0, 27); // 2026/1/27

        if (gameDate >= season6Start) {
            return '06';
        } else {
            return '05';
        }
    }

    // 📅 獲取 GitHub 資料夾用的賽季名稱
    getSeasonFolder(dateStr) {
        const parts = dateStr.replace(/-/g, '/').split('/');
        const gameDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const season6Start = new Date(2026, 0, 27); // 2026/1/27

        if (gameDate >= season6Start) {
            return 'season6';
        } else {
            return 'season5';
        }
    }

    // 🎯 主要功能：生成完整的預覽HTML
    generatePreviewHTML(adminData) {
        const gameInfo = this.extractGameInfo(adminData);
        const matchData = this.convertToMatchData(adminData);
        const finalScores = this.calculateFinalScores(matchData, adminData.drinkingBonus || {});
        const awayPlayers = this.extractPlayers(adminData, 'away');
        const homePlayers = this.extractPlayers(adminData, 'home');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="../../styles/common/game_result.css">
    <style>
        /* 預覽模式樣式增強 - 使用 #dc3545 主色調 */
        .preview-header {
            background: linear-gradient(135deg, #dc3545 0%, #b02a3a 100%);
            color: white;
            padding: 15px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.2);
        }
        .preview-header h1 {
            font-size: 20px;
            margin: 0 0 8px 0;
        }
        .preview-header p {
            font-size: 14px;
            margin: 0;
        }
        .preview-notice {
            background: #fdf2f2;
            border: 2px dashed #dc3545;
            padding: 10px;
            margin: 10px 0;
            text-align: center;
            border-radius: 5px;
            color: #dc3545;
            font-weight: bold;
        }
        /* 移除預覽按鈕區域 */
        .preview-actions {
            display: none;
        }
        /* 確保iframe內容不會覆蓋關閉按鈕 */
        body {
            margin: 0;
            padding: 0;
            overflow-x: auto;
        }
        .container {
            position: relative;
            z-index: 1;
        }
        
        /* 預覽模式專用的勝利圖標樣式 */
        .winner-icon {
            position: absolute;
            top: 50%;
            left: 4px;
            width: 30px;
            height: 30px;
            transform: translateY(-50%);
            background-image: url('../../images/winner.png');
            background-size: contain;
            background-repeat: no-repeat;
            z-index: 5;
        }
        
        /* 確保勝方標示有足夠的左側空間 */
        .winner {
            position: relative;
            text-align: center;
            vertical-align: middle;
            padding: 8px 6px 8px 38px !important;
        }
    </style>
</head>
<body>
    <div class="preview-header">
        <h1>比賽預覽</h1>
        <p>請確認以下資料正確</p>
    </div>
    
    <div class="preview-notice">
        這是預覽模式 - 資料尚未正式保存
    </div>

    <div class="container">
        <!-- 比賽資訊區 -->
        <div class="match-info">
            <h2 class="match-date">${gameInfo.date}</h2>
            <div class="venue-info">${gameInfo.venue}</div>
            <div class="match-result">
                <div class="team away">
                    <div class="team-name">${gameInfo.awayTeam}</div>
                    <div class="team-score">${finalScores.away}</div>
                </div>
                <div class="score-divider">:</div>
                <div class="team home">
                    <div class="team-score">${finalScores.home}</div>
                    <div class="team-name">${gameInfo.homeTeam}</div>
                </div>
            </div>
        </div>

        ${this.generateScoreDetailsTable(finalScores, gameInfo)}

        <div class="games-container">
            ${this.generateGameSections(matchData)}
            ${this.generateStatsSection(matchData, gameInfo, awayPlayers, homePlayers)}
        </div>
    </div>

    <script>
        // 預覽專用的簡化統計切換
        document.addEventListener('DOMContentLoaded', function() {
            console.log('預覽頁面載入完成');
            
            // 設置統計按鈕切換
            const statsBtns = document.querySelectorAll('.stats-btn');
            const awayStats = document.getElementById('awayStats');
            const homeStats = document.getElementById('homeStats');
            
            if (statsBtns.length && awayStats && homeStats) {
                statsBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        // 移除所有按鈕的活動狀態
                        statsBtns.forEach(b => b.classList.remove('active'));
                        // 添加當前按鈕的活動狀態
                        this.classList.add('active');
                        
                        // 顯示對應的統計表格
                        const team = this.getAttribute('data-team');
                        if (team === 'away') {
                            awayStats.classList.remove('hidden');
                            homeStats.classList.add('hidden');
                        } else {
                            homeStats.classList.remove('hidden');
                            awayStats.classList.add('hidden');
                        }
                    });
                });
                console.log('統計按鈕切換功能已設置');
            } else {
                console.warn('統計按鈕或表格未找到');
            }
        });
    </script>
</body>
</html>`;

        return html;
    }

    // 📊 提取比賽基本資訊
    extractGameInfo(adminData) {
        // 從 adminData 中提取或設定預設值
        return {
            date: adminData.gameDate || new Date().toLocaleDateString('zh-TW').replace(/\//g, '/'),
            venue: this.getVenueFromTeam(adminData.homeTeam),
            gameCode: adminData.gameId || 'g00',
            awayTeam: adminData.awayTeam || '客隊',
            homeTeam: adminData.homeTeam || '主隊'
        };
    }

    // 🏠 根據主隊決定比賽場地
    getVenueFromTeam(homeTeam) {
        if (!homeTeam) return '比賽場地';

        const venues = {
            '人生揪難': 'No.5 飛鏢Bar',
            '人生揪亮': 'No.5 飛鏢Bar',
            'Vivi嘻嘻隊': 'Vivi Bar',
            'Vivi哈哈隊': 'Vivi Bar',
            'Tonight29大四喜': 'Tonight29',
            'Tonight29大三元': 'Tonight29',
            'Tonight29十三么': 'Tonight29',
            '傑克黑桃': 'Jack',
            '傑克紅心': 'Jack',
            '逃生入口': '逃生入口 Bar',
            '酒空組': '藍白拖',
            '軟飯硬吃': '樂源A.K.A兩杯'
        };

        // 模糊匹配，以防隊名有微小差異
        for (const [team, venue] of Object.entries(venues)) {
            if (homeTeam.includes(team)) return venue;
        }

        return '比賽場地';
    }

    // 🔄 轉換 admin 數據為 match 格式
    convertToMatchData(adminData) {
        const matches = [];
        const gameCode = adminData.gameId || 'g00';

        // 從 adminData.sets 陣列中取得每個SET的資料
        for (let i = 1; i <= 16; i++) {
            const setData = adminData.sets && adminData.sets[i - 1];
            if (setData) {
                // 處理選手資料，如果沒有選擇則為空字串
                const awayPlayers = setData.awayPlayers || [];
                const homePlayers = setData.homePlayers || [];

                // 如果只有一個選手，直接返回字串；多個選手返回陣列
                const awayValue = awayPlayers.length === 0 ? '' : (awayPlayers.length === 1 ? awayPlayers[0] : awayPlayers);
                const homeValue = homePlayers.length === 0 ? '' : (homePlayers.length === 1 ? homePlayers[0] : homePlayers);

                matches.push({
                    set: i,
                    type: this.getSetType(i),
                    away: awayValue,
                    home: homeValue,
                    firstAttack: setData.firstAttack || null,
                    winner: setData.winner || null,
                    gameCode: gameCode
                });
            } else {
                // 沒有資料時設為空
                matches.push({
                    set: i,
                    type: this.getSetType(i),
                    away: '',
                    home: '',
                    firstAttack: null,
                    winner: null,
                    gameCode: gameCode
                });
            }
        }

        return matches;
    }

    // 🎮 決定SET類型
    getSetType(setNumber) {
        if (setNumber <= 5) return '01';
        if (setNumber <= 10) return 'CR';
        if (setNumber <= 14) return setNumber <= 12 ? '01' : 'CR';
        return setNumber === 15 ? '01' : 'CR';
    }

    // 🏆 計算最終比分
    calculateFinalScores(matchData, drinkingBonus = {}) {
        // SET分數定義
        const setScores = {
            1: 1, 2: 1, 3: 1, 4: 1,     // SET1-4: 1分（單人賽）
            5: 3,                        // SET5: 3分（三人賽 701）
            6: 1, 7: 1, 8: 1, 9: 1,     // SET6-9: 1分（單人Cricket）
            10: 3,                       // SET10: 3分（三人賽 Cricket）
            11: 2, 12: 2,               // SET11-12: 2分（雙人賽）
            13: 2, 14: 2,               // SET13-14: 2分（雙人賽 Cricket）
            15: 4, 16: 4                // SET15-16: 4分（四人賽）
        };

        let awayScore = 0;
        let homeScore = 0;
        let awayWins = 0;
        let homeWins = 0;

        matchData.forEach(match => {
            // 只有當選手都有選擇且有勝負結果時才計分
            const awayPlayer = Array.isArray(match.away) ? match.away.join(', ') : (match.away || '');
            const homePlayer = Array.isArray(match.home) ? match.home.join(', ') : (match.home || '');

            // 檢查選手是否都已填寫且有勝負結果
            const hasAwayPlayers = awayPlayer.trim() !== '';
            const hasHomePlayers = homePlayer.trim() !== '';
            const hasWinner = match.winner && match.winner !== null;

            if (hasAwayPlayers && hasHomePlayers && hasWinner) {
                const setScore = setScores[match.set] || 1;
                if (match.winner === 'away') {
                    awayScore += setScore;
                    awayWins++;
                } else if (match.winner === 'home') {
                    homeScore += setScore;
                    homeWins++;
                }
            }
        });

        // 勝方加分（比賽成績較高的隊伍加1分）
        const winnerBonus = {
            away: awayScore > homeScore ? 1 : 0,
            home: homeScore > awayScore ? 1 : 0
        };

        // 飲酒加成
        const finalDrinkingBonus = {
            away: drinkingBonus.away || 0,
            home: drinkingBonus.home || 0
        };

        return {
            away: awayScore + winnerBonus.away + finalDrinkingBonus.away,
            home: homeScore + winnerBonus.home + finalDrinkingBonus.home,
            // 提供分數細分資訊
            breakdown: {
                baseScores: { away: awayScore, home: homeScore },
                winnerBonus,
                drinkingBonus: finalDrinkingBonus
            }
        };
    }

    // 📋 生成比賽區塊
    generateGameSections(matchData) {
        const sections = {
            individual: matchData.slice(0, 5),   // SET 1-5
            cricket: matchData.slice(5, 10),     // SET 6-10
            doubles: matchData.slice(10, 14),    // SET 11-14
            team: matchData.slice(14, 16)        // SET 15-16
        };

        let html = '';

        Object.entries(sections).forEach(([sectionKey, matches]) => {
            html += `
            <div class="game-section">
                <h3>${this.sectionTitles[sectionKey]}</h3>
                ${sectionKey === 'individual' ? '<h4>(黃底為先攻場次)</h4>' : ''}
                <table class="game-table">
                    <tr>
                        <th>賽局</th>
                        <th>客隊</th>
                        <th>主隊</th>
                    </tr>
                    ${matches.map(match => this.generateMatchRow(match)).join('')}
                </table>
            </div>`;
        });

        return html;
    }

    // 🎯 生成單場比賽行
    generateMatchRow(match) {
        // 如果選手資料不完整，顯示空白
        const awayPlayer = Array.isArray(match.away) ? match.away.join(', ') : (match.away || '');
        const homePlayer = Array.isArray(match.home) ? match.home.join(', ') : (match.home || '');

        // 調試信息：檢查 winner 數據
        console.log(`SET${match.set} - Away: "${awayPlayer}", Home: "${homePlayer}", Winner: "${match.winner}", FirstAttack: "${match.firstAttack}"`);

        // 只有當選手都有選擇時，才顯示先攻和勝負
        let awayClass = '';
        let homeClass = '';
        let awayWinClass = '';
        let homeWinClass = '';
        let awayWinIcon = '';
        let homeWinIcon = '';

        if (awayPlayer && homePlayer) {
            awayClass = match.firstAttack === 'away' ? 'first-attack' : '';
            homeClass = match.firstAttack === 'home' ? 'first-attack' : '';
            awayWinClass = match.winner === 'away' ? 'winner' : '';
            homeWinClass = match.winner === 'home' ? 'winner' : '';
            awayWinIcon = match.winner === 'away' ? '<div class="winner-icon"></div>' : '';
            homeWinIcon = match.winner === 'home' ? '<div class="winner-icon"></div>' : '';

            // 調試信息：檢查生成的樣式類別和圖標
            console.log(`SET${match.set} - Away Classes: "${awayClass} ${awayWinClass}", Home Classes: "${homeClass} ${homeWinClass}"`);
            console.log(`SET${match.set} - Away Icon: "${awayWinIcon}", Home Icon: "${homeWinIcon}"`);
        }

        return `
        <tr>
            <td class="game-type">SET${match.set}<br><span class="game-detail">${this.gameTypes[match.set]}</span></td>
            <td class="${awayClass} ${awayWinClass}">
                ${awayWinIcon}
                ${awayPlayer}
            </td>
            <td class="${homeClass} ${homeWinClass}">
                ${homeWinIcon}
                ${homePlayer}
            </td>
        </tr>`;
    }

    // 📊 生成統計區塊
    generateStatsSection(matchData, gameInfo, awayPlayers, homePlayers) {
        const awayStatsData = this.calculatePlayerStats(matchData, awayPlayers, 'away');
        const homeStatsData = this.calculatePlayerStats(matchData, homePlayers, 'home');

        return `
        <div class="game-section">
            <h3>選手統計</h3>
            <div class="stats-buttons">
                <button class="stats-btn active" data-team="away">客場選手</button>
                <button class="stats-btn" data-team="home">主場選手</button>
            </div>
            
            <table class="game-table stats-table" id="awayStats">
                <tr>
                    <th class="player-name">選手</th>
                    <th class="stat-cell">01出賽</th>
                    <th class="stat-cell">01勝場</th>
                    <th class="stat-cell">CR出賽</th>
                    <th class="stat-cell">CR勝場</th>
                    <th class="stat-cell">合計出賽</th>
                    <th class="stat-cell">合計勝場</th>
                    <th class="stat-cell">先攻數</th>
                </tr>
                ${awayStatsData.map(stats => `
                <tr>
                    <td class="player-name">${stats.name}</td>
                    <td class="stat-cell">${stats.o1Games}</td>
                    <td class="stat-cell">${stats.o1Wins}</td>
                    <td class="stat-cell">${stats.crGames}</td>
                    <td class="stat-cell">${stats.crWins}</td>
                    <td class="stat-cell">${stats.totalGames}</td>
                    <td class="stat-cell">${stats.totalWins}</td>
                    <td class="stat-cell">${stats.firstAttacks}</td>
                </tr>
                `).join('')}
            </table>

            <table class="game-table stats-table hidden" id="homeStats">
                <tr>
                    <th class="player-name">選手</th>
                    <th class="stat-cell">01出賽</th>
                    <th class="stat-cell">01勝場</th>
                    <th class="stat-cell">CR出賽</th>
                    <th class="stat-cell">CR勝場</th>
                    <th class="stat-cell">合計出賽</th>
                    <th class="stat-cell">合計勝場</th>
                    <th class="stat-cell">先攻數</th>
                </tr>
                ${homeStatsData.map(stats => `
                <tr>
                    <td class="player-name">${stats.name}</td>
                    <td class="stat-cell">${stats.o1Games}</td>
                    <td class="stat-cell">${stats.o1Wins}</td>
                    <td class="stat-cell">${stats.crGames}</td>
                    <td class="stat-cell">${stats.crWins}</td>
                    <td class="stat-cell">${stats.totalGames}</td>
                    <td class="stat-cell">${stats.totalWins}</td>
                    <td class="stat-cell">${stats.firstAttacks}</td>
                </tr>
                `).join('')}
            </table>
        </div>`;
    }

    // 📈 計算選手統計數據
    calculatePlayerStats(matchData, players, team) {
        return players.map(playerName => {
            let o1Games = 0, o1Wins = 0, crGames = 0, crWins = 0, firstAttacks = 0;

            matchData.forEach(match => {
                // 取得該隊的選手
                const teamPlayers = match[team];
                const playersList = Array.isArray(teamPlayers) ? teamPlayers : [teamPlayers];

                // 檢查該選手是否參與此場比賽
                if (playersList.includes(playerName) && playersList[0] !== '') {
                    // 計算出賽次數
                    if (match.type === '01') {
                        o1Games++;
                        if (match.winner === team) o1Wins++;
                    } else if (match.type === 'CR') {
                        crGames++;
                        if (match.winner === team) crWins++;
                    }

                    // 計算先攻次數
                    if (match.firstAttack === team) {
                        firstAttacks++;
                    }
                }
            });

            return {
                name: playerName,
                o1Games,
                o1Wins,
                crGames,
                crWins,
                totalGames: o1Games + crGames,
                totalWins: o1Wins + crWins,
                firstAttacks
            };
        });
    }

    // 💰 生成分數詳情表格
    generateScoreDetailsTable(finalScores, gameInfo) {
        // 使用 finalScores.breakdown 中的詳細分數資訊
        const breakdown = finalScores.breakdown || {
            baseScores: { away: 0, home: 0 },
            winnerBonus: { away: 0, home: 0 },
            drinkingBonus: { away: 0, home: 0 }
        };

        return `
        <div class="score-details">
            <table class="score-table">
                <tr>
                    <th></th>
                    <th>${gameInfo.awayTeam}</th>
                    <th>${gameInfo.homeTeam}</th>
                </tr>
                <tr>
                    <td>比賽成績</td>
                    <td>${breakdown.baseScores.away}</td>
                    <td>${breakdown.baseScores.home}</td>
                </tr>
                <tr>
                    <td>勝方加分</td>
                    <td>${breakdown.winnerBonus.away}</td>
                    <td>${breakdown.winnerBonus.home}</td>
                </tr>
                <tr>
                    <td>飲酒加成</td>
                    <td>${breakdown.drinkingBonus.away}</td>
                    <td>${breakdown.drinkingBonus.home}</td>
                </tr>
                <tr>
                    <td>最終總分</td>
                    <td class="final-score">${finalScores.away}</td>
                    <td class="final-score">${finalScores.home}</td>
                </tr>
            </table>
        </div>`;
    }

    // 👥 提取選手清單
    extractPlayers(adminData, team) {
        console.log(`提取${team}隊選手`, adminData);
        const players = [];

        if (adminData.sets) {
            adminData.sets.forEach((set, index) => {
                const teamPlayers = team === 'away' ? set.awayPlayers : set.homePlayers;
                console.log(`SET${index + 1} ${team}隊選手:`, teamPlayers);

                if (Array.isArray(teamPlayers) && teamPlayers.length > 0) {
                    teamPlayers.forEach(player => {
                        if (player && player.trim() && !players.includes(player)) {
                            players.push(player);
                        }
                    });
                } else if (teamPlayers && typeof teamPlayers === 'string' && teamPlayers.trim() && !players.includes(teamPlayers)) {
                    players.push(teamPlayers);
                }
            });
        }

        console.log(`${team}隊最終選手清單:`, players);

        // 如果沒有選手，使用隊伍名稱加編號作為預設值
        if (players.length === 0) {
            const teamName = team === 'away' ? adminData.awayTeam : adminData.homeTeam;
            return [`${teamName}選手1`, `${teamName}選手2`, `${teamName}選手3`];
        }

        return players;
    }
}

// 🚀 全域實例化
const previewGenerator = new GameResultPreviewGenerator();

// 📤 導出功能函數
function generateGamePreview(adminData) {
    return previewGenerator.generatePreviewHTML(adminData);
}

function showPreviewModal(adminData) {
    const previewHTML = generateGamePreview(adminData);

    // 如果已經存在模態框，先移除
    const existingModal = document.querySelector('.match-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }

    // 創建模態框容器 - 使用和main.js相同的樣式
    const modal = document.createElement('div');
    modal.className = 'match-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    // 創建模態框內容
    const modalContent = document.createElement('div');
    modalContent.className = 'match-modal-content';
    modalContent.style.cssText = `
         position: relative;
         width: 90%;
         height: 90%;
         background: white;
         border-radius: 8px;
         overflow: visible;
         box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
         transform: scale(0.95);
         transition: transform 0.3s ease;
     `;

    // 添加關閉按鈕 - 使用和main.js相同的樣式
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
         position: absolute;
         right: -15px;
         top: -15px;
         width: 30px;
         height: 30px;
         border-radius: 50%;
         background-color: #fa363a;
         color: white;
         border: none;
         cursor: pointer;
         font-size: 20px;
         line-height: 1;
         z-index: 10001;
         display: flex;
         justify-content: center;
         align-items: center;
         box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
         transition: all 0.2s ease;
     `;
    closeButton.addEventListener('mouseenter', function () {
        this.style.backgroundColor = '#e62e32';
        this.style.transform = 'scale(1.1)';
    });
    closeButton.addEventListener('mouseleave', function () {
        this.style.backgroundColor = '#fa363a';
        this.style.transform = 'scale(1)';
    });
    closeButton.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeMatchModal(modal);
    });

    // 創建iframe來加載比賽結果頁面
    const iframe = document.createElement('iframe');
    iframe.className = 'match-iframe';
    iframe.style.cssText = `
         width: 100%;
         height: 100%;
         border: none;
         border-radius: 8px;
         opacity: 0;
         transition: opacity 0.3s ease 0.1s;
     `;
    iframe.srcdoc = previewHTML;

    modalContent.appendChild(closeButton);
    modalContent.appendChild(iframe);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 確保模態框顯示 - 使用和main.js相同的動畫邏輯
    setTimeout(function () {
        modal.classList.add('visible');
        modalContent.style.transform = 'scale(1)';
        iframe.style.opacity = '1';
    }, 10);

    // 點擊模態框外部關閉
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeMatchModal(modal);
        }
    });

    // ESC鍵關閉
    const handleKeyPress = function (e) {
        if (e.key === 'Escape') {
            closeMatchModal(modal);
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
    document.addEventListener('keydown', handleKeyPress);
}

// 關閉模態框的函數 - 使用和main.js相同的邏輯
function closeMatchModal(modal) {
    modal.classList.remove('visible');

    // 等待動畫完成後再移除元素
    setTimeout(() => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    }, 300);
} 