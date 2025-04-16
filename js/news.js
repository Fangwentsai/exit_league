// 立即執行的測試
console.log('news.js 已載入');
alert('news.js 已載入'); // 添加一個彈窗測試

async function loadMatches() {
    try {
        console.log('開始載入比賽數據...');
        const url = '/data/schedule_s4.json';
        console.log('嘗試讀取:', url);
        
        const response = await fetch(url);
        console.log('fetch 響應狀態:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('成功解析數據:', data);
        
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
    }
}

// 生成比賽 HTML
function createMatchesHTML(matchDay) {
    return `
        <div class="match-date">${matchDay.date}</div>
        <div class="matches-container">
            ${matchDay.games.map(game => `
                <div class="match-item">
                    ${game.team1} <span class="vs">VS</span> ${game.team2}
                </div>
            `).join('')}
        </div>
    `;
}

// 確保 DOM 載入完成後才執行
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已載入，開始執行 loadMatches');
    loadMatches();
});