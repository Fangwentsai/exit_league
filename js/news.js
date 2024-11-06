async function loadMatches() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Fangwentsai/exit_league/main/data/schedule.json');
        const data = await response.json();
        
        // 取得今天日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 找出最近過去的比賽（上週）
        let lastMatch = null;
        let minPastDiff = Infinity;
        
        // 找出最近將來的比賽（下週）
        let nextMatch = null;
        let minFutureDiff = Infinity;
        
        data.schedule.forEach(matchDay => {
            const matchDate = new Date(matchDay.date);
            matchDate.setHours(0, 0, 0, 0);
            const timeDiff = matchDate - today;
            
            // 上週比賽（過去最近）
            if (timeDiff < 0 && Math.abs(timeDiff) < minPastDiff) {
                minPastDiff = Math.abs(timeDiff);
                lastMatch = matchDay;
            }
            
            // 下週比賽（未來最近）
            if (timeDiff > 0 && timeDiff < minFutureDiff) {
                minFutureDiff = timeDiff;
                nextMatch = matchDay;
            }
        });

        // 顯示上週比賽
        if (lastMatch) {
            document.getElementById('lastWeekMatchesContent').innerHTML = generateMatchesHTML(lastMatch);
        }

        // 顯示下週比賽
        if (nextMatch) {
            document.getElementById('upcomingMatchesContent').innerHTML = generateMatchesHTML(nextMatch);
        }

    } catch (error) {
        console.error('Error loading matches:', error);
        document.getElementById('lastWeekMatchesContent').innerHTML = '<p>載入上週戰況時發生錯誤</p>';
        document.getElementById('upcomingMatchesContent').innerHTML = '<p>載入近期比賽時發生錯誤</p>';
    }
}

// 生成比賽 HTML 的輔助函數
function generateMatchesHTML(matchDay) {
    return `
        <div class="match-date">${matchDay.date}</div>
        <div class="matches-container">
            ${matchDay.games.map(game => `
                <div class="match-item">
                    <div class="team">${game.team1}</div>
                    <div class="vs">VS</div>
                    <div class="team">${game.team2.replace('(主)', '')}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', loadMatches);