// 測試數據
const TEST_DATA = {
    values: [
        {
            date: "11/5",
            games: [
                ["逃生入口A", "", "vs", "", "逃生入口C"],
                ["逃生入口B", "", "vs", "", "JACK都說隊"],
                ["VIVI朝九晚五", "", "vs", "", "醉販"],
                ["海盜揪硬", "", "vs", "", "人生揪難"]
            ]
        },
        {
            date: "11/12",
            games: [
                ["海盜揪硬", "", "vs", "", "逃生入口A"],
                ["VIVI朝九晚五", "", "vs", "", "逃生入口B"],
                ["逃生入口C", "", "vs", "", "JACK都說隊"],
                ["醉販", "", "vs", "", "人生揪難"]
            ]
        }
    ]
};

// 新聞載入函數
function loadNews() {
    console.log('執行 loadNews 函數');
    const newsContent = document.getElementById('newsContent');
    if (newsContent) {
        newsContent.innerHTML = `
            <div class="news-item">
                <div class="news-date">2023/11/1</div>
                <div class="news-title">聯賽開始</div>
                <div class="news-text">難找的聯賽第三季正式開始！</div>
            </div>
        `;
    }
}

// 獲取最近的比賽
function getUpcomingMatches() {
    console.log('開始執行 getUpcomingMatches');
    
    const today = new Date();
    console.log('今天日期:', today);
    
    let closestDate = null;
    let closestMatches = null;

    // 找出最近的比賽日期
    TEST_DATA.values.forEach(weekData => {
        console.log('處理比賽日期:', weekData.date);
        
        const [month, day] = weekData.date.split('/');
        const matchDate = new Date(2024, parseInt(month) - 1, parseInt(day));
        console.log('比賽日期:', matchDate);
        
        if (matchDate >= today && (closestDate === null || matchDate < closestDate)) {
            console.log('找到更近的比賽日期');
            closestDate = matchDate;
            closestMatches = weekData;
        }
    });

    console.log('最近的比賽:', closestMatches);

    // 如果找到最近的比賽，顯示它們
    if (closestMatches) {
        console.log('準備生成 HTML');
        const upcomingMatchesHtml = `
            <div class="match-date">${closestMatches.date}</div>
            ${closestMatches.games.map(game => `
                <div class="match-item">
                    <div class="match-teams">
                        ${game[0]} <span class="vs">vs</span> ${game[4]}
                    </div>
                </div>
            `).join('')}
        `;

        console.log('生成的 HTML:', upcomingMatchesHtml);
        
        const container = document.getElementById('upcomingMatchesContent');
        console.log('找到容器元素:', container);
        
        if (container) {
            container.innerHTML = upcomingMatchesHtml;
        } else {
            console.error('找不到容器元素 upcomingMatchesContent');
        }
    } else {
        console.log('沒有找到近期比賽');
        const container = document.getElementById('upcomingMatchesContent');
        if (container) {
            container.innerHTML = '<p>目前沒有近期比賽</p>';
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 載入完成');
    loadNews();
    console.log('新聞載入完成');
    getUpcomingMatches();
}); 