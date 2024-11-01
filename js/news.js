// 使用完整的 raw URL
async function loadUpcomingMatches() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Fangwentsai/exit_league/main/data/schedule.json');
        const data = await response.json();
        
        // 取得今天日期
        const today = new Date();
        console.log('今天日期:', today);
        
        // 找出最近的比賽日期
        let closestMatch = null;
        let minDiff = Infinity;
        
        data.schedule.forEach(matchDay => {
            const matchDate = new Date(matchDay.date);
            console.log('比較日期:', matchDate);
            
            // 計算日期差異（絕對值）
            const timeDiff = Math.abs(matchDate - today);
            
            // 如果找到更近的日期，更新
            if (timeDiff < minDiff) {
                minDiff = timeDiff;
                closestMatch = matchDay;
            }
        });

        console.log('最近的比賽:', closestMatch);

        // 如果找到最近的比賽，顯示它們
        if (closestMatch) {
            const upcomingMatchesHtml = `
                <div class="match-date">${closestMatch.date}</div>
                ${closestMatch.games.map(game => `
                    <div class="match-item">
                        <div class="match-teams">
                            <span class="team-name">${game.team1}</span>
                            <span class="vs">vs</span>
                            <span class="team-name right">${game.team2}</span>
                        </div>
                    </div>
                `).join('')}
            `;

            document.getElementById('upcomingMatchesContent').innerHTML = upcomingMatchesHtml;
        } else {
            document.getElementById('upcomingMatchesContent').innerHTML = '<p>目前沒有近期比賽</p>';
        }
    } catch (error) {
        console.error('Error loading upcoming matches:', error);
        document.getElementById('upcomingMatchesContent').innerHTML = '<p>載入比賽資料時發生錯誤</p>';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    loadUpcomingMatches();
});

// 新聞載入函數
function loadNews() {
    console.log('執行 loadNews 函數');
    const newsContent = document.getElementById('newsContent');
    if (newsContent) {
        newsContent.innerHTML = `
            <div class="news-item">
                <div class="news-date">2024/10/15</div>
                <div class="news-title">阿淦幣即日起開始發售</div>
                <div class="news-text">
                    <p>第二屆阿淦因其優異的手氣榮獲地獄倒霉鬼殊榮，即日起凡於比賽店家持100元阿淦幣消費即可換取一杯shot。</p>
                    <img src="../images/agan.png" alt="阿淦幣" class="news-image">
                </div>
            </div>
            <div class="news-item">
                <div class="news-date">2024/11/1</div>
                <div class="news-title">聯賽開始</div>
                <div class="news-text">難找的聯賽第三季正式開始！</div>
            </div>
        `;
    }
} 