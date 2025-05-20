// 立即執行的測試
console.log('news.js 已載入');

async function loadMatches() {
    try {
        console.log('開始載入比賽數據...');
        
        // 首先嘗試從API獲取數據
        let response = null;
        let data = null;
        let fetchError = null;
        
        try {
            // 首先嘗試使用main.js中的Google Sheet API取得數據
            const sheetId = '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE'; // Season 4的Sheet ID
            const apiKey = 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4';
            const gsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/schedule?key=${apiKey}`;
            
            console.log('嘗試從Google Sheets API獲取數據:', gsheetUrl);
            response = await fetch(gsheetUrl);
            
            if (!response.ok) throw new Error(`Google Sheets API請求失敗，狀態: ${response.status}`);
            
            const rawData = await response.json();
            console.log('從API獲取的原始數據:', rawData);
            
            // 轉換為應用程序需要的格式
            if (rawData && rawData.values && rawData.values.length > 0) {
                // 轉換Google Sheet數據為應用格式
                data = {
                    schedule: []
                };
                
                let currentDate = '';
                let currentGames = [];
                
                // 假設數據格式: [日期, 比賽號碼, 客隊, 客隊分數, 主隊分數, 主隊, ...]
                rawData.values.forEach(row => {
                    if (row.length >= 6) {
                        const date = row[0];
                        const gameNumber = row[1];
                        const team1 = row[2] + (row[3] ? ` ${row[3]}` : '');
                        const team2 = (row[4] ? `${row[4]} ` : '') + row[5];
                        
                        // 如果日期變了，創建新的比賽日
                        if (date && date !== currentDate) {
                            if (currentDate && currentGames.length > 0) {
                                data.schedule.push({
                                    date: currentDate,
                                    games: [...currentGames]
                                });
                            }
                            currentDate = date;
                            currentGames = [];
                        }
                        
                        // 添加比賽到當前日期
                        if (gameNumber) {
                            currentGames.push({
                                game_number: gameNumber,
                                team1: team1,
                                team2: team2
                            });
                        }
                    }
                });
                
                // 添加最後一組數據
                if (currentDate && currentGames.length > 0) {
                    data.schedule.push({
                        date: currentDate,
                        games: [...currentGames]
                    });
                }
                
                console.log('處理後的API數據:', data);
            } else {
                throw new Error('API返回的數據格式不符合預期');
            }
        } catch (apiError) {
            console.error('從API獲取數據失敗，嘗試使用本地JSON:', apiError);
            fetchError = apiError;
            
            // API獲取失敗，嘗試使用本地JSON文件
            const url = '/data/schedule_s4.json';
            console.log('嘗試讀取本地JSON文件:', url);
            
            response = await fetch(url);
            if (!response.ok) throw new Error(`本地JSON讀取失敗，狀態: ${response.status}`);
            
            data = await response.json();
            console.log('成功從本地JSON獲取數據:', data);
        }
        
        // 如果兩種方式都沒有獲取到數據，拋出錯誤
        if (!data && !response.ok) {
            throw new Error('無法從任何來源獲取數據');
        }
        
        // 取得今天日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('今天日期:', today);
        
        // 找出最近過去的比賽（上週）
        let lastMatch = null;
        let minPastDiff = Infinity;
        
        // 找出最近將來的比賽（下週）
        let nextMatch = null;
        let minFutureDiff = Infinity;
        
        if (!data.schedule || !Array.isArray(data.schedule)) {
            console.error('無效的數據格式:', data);
            throw new Error('無效的數據格式');
        }

        data.schedule.forEach(matchDay => {
            console.log('處理比賽日期:', matchDay.date);
            const [year, month, day] = matchDay.date.split('/');
            const matchDate = new Date(year, month - 1, day);
            matchDate.setHours(0, 0, 0, 0);
            
            const timeDiff = matchDate - today;
            console.log('日期差異:', {
                比賽日期: matchDate,
                時間差: timeDiff
            });
            
            if (timeDiff < 0 && Math.abs(timeDiff) < minPastDiff) {
                minPastDiff = Math.abs(timeDiff);
                lastMatch = matchDay;
                console.log('更新上週比賽:', matchDay);
            }
            
            if (timeDiff > 0 && timeDiff < minFutureDiff) {
                minFutureDiff = timeDiff;
                nextMatch = matchDay;
                console.log('更新下週比賽:', matchDay);
            }
        });

        console.log('最終結果:', {
            上週比賽: lastMatch,
            下週比賽: nextMatch
        });

        // 顯示上週比賽
        if (lastMatch) {
            const lastWeekHTML = createMatchesHTML(lastMatch);
            console.log('生成的上週比賽 HTML:', lastWeekHTML);
            document.getElementById('lastWeekMatchesContent').innerHTML = lastWeekHTML;
        } else {
            document.getElementById('lastWeekMatchesContent').innerHTML = '<p>沒有上週的比賽記錄</p>';
        }

        // 顯示下週比賽
        if (nextMatch) {
            const nextWeekHTML = createMatchesHTML(nextMatch);
            console.log('生成的下週比賽 HTML:', nextWeekHTML);
            document.getElementById('upcomingMatchesContent').innerHTML = nextWeekHTML;
        } else {
            document.getElementById('upcomingMatchesContent').innerHTML = '<p>沒有即將到來的比賽</p>';
        }

    } catch (error) {
        console.error('載入比賽時發生錯誤:', error);
        document.getElementById('lastWeekMatchesContent').innerHTML = 
            `<p>載入上週戰況時發生錯誤: ${error.message}</p>`;
        document.getElementById('upcomingMatchesContent').innerHTML = 
            `<p>載入近期比賽時發生錯誤: ${error.message}</p>`;
        
        // 使用備用靜態數據
        console.log('使用備用靜態數據...');
        try {
            // 使用靜態匹配數據作為備用
            const lastMatchData = {
                date: "2025/5/13",
                games: [
                    { game_number: "g21", team1: "逃生入口A 11", team2: "25 酒空組" },
                    { game_number: "g22", team1: "人生揪難 26", team2: "10 逃生入口C" },
                    { game_number: "g23", team1: "一鏢開天門 12", team2: "24 VIVI朝酒晚舞" },
                    { game_number: "g24", team1: "Jack 25", team2: "11 海盜揪硬" }
                ]
            };
            
            const nextMatchData = {
                date: "2025/5/20",
                games: [
                    { game_number: "g25", team1: "人生揪難", team2: "逃生入口A" },
                    { game_number: "g26", team1: "酒空組", team2: "VIVI朝酒晚舞" },
                    { game_number: "g27", team1: "一鏢開天門", team2: "Jack" },
                    { game_number: "g28", team1: "逃生入口C", team2: "海盜揪硬" }
                ]
            };
            
            document.getElementById('lastWeekMatchesContent').innerHTML = createMatchesHTML(lastMatchData);
            document.getElementById('upcomingMatchesContent').innerHTML = createMatchesHTML(nextMatchData);
            console.log('成功加載靜態備用數據');
        } catch (backupError) {
            console.error('使用備用數據也失敗:', backupError);
        }
    }
}

// 生成比賽 HTML
function createMatchesHTML(matchDay) {
    return `
        <div class="match-date">${matchDay.date}</div>
        <div class="matches-container">
            ${matchDay.games.map(game => {
                // 更準確地提取隊伍名稱和分數
                let extractTeamInfo = (teamStr) => {
                    // 提取分數與隊名
                    let parts = teamStr.split(' ');
                    let score = '';
                    let name = '';
                    let venue = '';
                    
                    if (parts.length >= 2) {
                        // 檢查主場標記
                        let hasVenue = false;
                        for (let i = 0; i < parts.length; i++) {
                            if (parts[i].includes('(主)')) {
                                hasVenue = true;
                                venue = parts[i].replace('(主)', '');
                                parts.splice(i, 1);
                                break;
                            }
                        }
                        
                        // 檢查第一個部分是否為數字（分數）
                        if (!isNaN(parseInt(parts[0]))) {
                            // 格式: "25 VIVI朝酒晚舞"
                            score = parts[0];
                            name = parts.slice(1).join(' ');
                        } else if (!isNaN(parseInt(parts[parts.length - 1]))) {
                            // 格式: "逃生入口A 11"
                            score = parts[parts.length - 1];
                            name = parts.slice(0, parts.length - 1).join(' ');
                        } else {
                            // 沒有分數的情況
                            name = parts.join(' ');
                        }
                    } else {
                        // 只有隊名沒有分數
                        name = parts[0].replace('(主)', '');
                    }
                    
                    return { name, score, venue };
                };
                
                let team1Info = extractTeamInfo(game.team1);
                let team2Info = extractTeamInfo(game.team2);
                
                // 獲取比賽場地
                let venueText = '';
                if (team1Info.venue) {
                    venueText = team1Info.venue;
                } else if (team2Info.venue) {
                    venueText = team2Info.venue;
                }
                
                // 簡化比賽代碼，只使用數字部分
                let gameCode = '';
                if (game.game_number) {
                    // 提取數字部分，例如 "g21" 變成 "21"
                    const matches = game.game_number.match(/\d+/);
                    if (matches && matches[0]) {
                        gameCode = matches[0];
                    } else {
                        gameCode = game.game_number.toUpperCase();
                    }
                }
                
                // 添加onclick屬性來打開模態窗口，僅在有比分時才添加點擊事件
                const hasScores = team1Info.score && team2Info.score;
                const clickAttr = hasScores ? `onclick="showMatchDetails('game_result/season4/${game.game_number}.html')"` : '';
                const cursorStyle = hasScores ? 'style="cursor: pointer;"' : '';
                
                // 使用表格布局確保對齊
                return `
                <div class="match-item" ${cursorStyle} ${clickAttr}>
                    <div class="game-code">G${gameCode}</div>
                    <table class="match-table">
                        <tr>
                            <td class="team-col team-left">
                                <div class="team-name">${team1Info.name}</div>
                                ${team1Info.score ? `<div class="score">${team1Info.score}</div>` : ''}
                            </td>
                            <td class="vs-col">VS</td>
                            <td class="team-col team-right">
                                <div class="team-name">${team2Info.name}</div>
                                ${team2Info.score ? `<div class="score">${team2Info.score}</div>` : ''}
                            </td>
                        </tr>
                    </table>
                    ${venueText ? `<div class="venue-text">${venueText}</div>` : ''}
                </div>
                `;
            }).join('')}
        </div>
    `;
}

// 確保 DOM 載入完成後才執行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已載入，開始執行 loadMatches');
    loadMatches();
});