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
            document.getElementById('lastWeekMatchesContent').innerHTML = createLastWeekMatchHTML(lastMatch);
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
                <a href="#" class="match-item">
                    ${game.team1} <span class="vs">VS</span> ${game.team2}
                </a>
            `).join('')}
        </div>
    `;
}

function createMatchHTML(match) {
    return `
        <div class="match-date">${match.date}</div>
        <a href="../game_result/${match.game_number}.html" class="match-item">
            ${match.team1} <span class="vs">VS</span> ${match.team2}
        </a>
    `;
}

// 生成上週比賽的 HTML
function createLastWeekMatchHTML(match) {
    if (!match) return '';
    
    return `
        <div class="match-date">${match.date}</div>
        <div class="matches-container">
            ${match.games.map(game => `
                <a href="#" class="match-item" 
                   onclick="openGameModal('${game.game_number}')"
                   data-game-number="${game.game_number}">
                    ${game.team1} <span class="vs">VS</span> ${game.team2}
                </a>
            `).join('')}
        </div>
    `;
}

// 添加懸浮視窗相關函數
function openGameModal(gameNumber) {
    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameFrame');
    
    if (modal && iframe) {
        iframe.src = `../game_result/${gameNumber}.html`;
        modal.style.display = 'block';
    }
}

function closeGameModal() {
    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameFrame');
    
    if (modal && iframe) {
        iframe.src = '';
        modal.style.display = 'none';
    }
}

// 點擊視窗外關閉視窗
window.onclick = function(event) {
    const modal = document.getElementById('gameModal');
    if (event.target == modal) {
        closeGameModal();
    }
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', loadMatches);