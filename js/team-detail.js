// 隊伍詳細頁面JavaScript功能

let setChart = null;
let currentTopPlayersData = null; // 儲存當前隊伍的排行榜數據

// SET項目定義
const setTypes = {
    1: "501 (OI/MO)",
    2: "501 (DI/DO)", 
    3: "701 (OI/MO)",
    4: "701 (OI/MO, 25/50)",
    5: "三人賽 701",
    6: "Cricket",
    7: "Cricket",
    8: "HALF-IT",
    9: "HALF-IT", 
    10: "三人賽 Cricket",
    11: "701 雙人賽",
    12: "701 雙人賽 FREEZE",
    13: "Cricket 雙人賽",
    14: "Team Cricket",
    15: "四人賽 1101",
    16: "四人賽 Cricket"
};

// 正確的隊伍戰績數據（從Season 3統計計算方法說明的最終排名表）
const teamRecords = {
    "Vivi朝酒晚舞": { wins: 11, losses: 1, draws: 2 },
    "海盜揪硬": { wins: 12, losses: 1, draws: 1 },
    "醉販": { wins: 9, losses: 5, draws: 0 },
    "酒空組": { wins: 6, losses: 7, draws: 1 },
    "Jack": { wins: 4, losses: 10, draws: 0 },
    "逃生入口C": { wins: 5, losses: 9, draws: 0 },
    "逃生入口A": { wins: 5, losses: 8, draws: 1 },
    "人生揪難": { wins: 1, losses: 12, draws: 1 }
};

// 正確的SET統計數據（從真實比賽解析得出）
const teamSetStats = {
    "海盜揪硬": {
        1: {wins: 8, losses: 6, played: 14}, 2: {wins: 9, losses: 5, played: 14},
        3: {wins: 10, losses: 4, played: 14}, 4: {wins: 5, losses: 9, played: 14},
        5: {wins: 9, losses: 5, played: 14}, 6: {wins: 8, losses: 6, played: 14},
        7: {wins: 10, losses: 4, played: 14}, 8: {wins: 11, losses: 3, played: 14},
        9: {wins: 7, losses: 7, played: 14}, 10: {wins: 11, losses: 3, played: 14},
        11: {wins: 9, losses: 5, played: 14}, 12: {wins: 8, losses: 6, played: 14},
        13: {wins: 10, losses: 4, played: 14}, 14: {wins: 8, losses: 6, played: 14},
        15: {wins: 13, losses: 1, played: 14}, 16: {wins: 12, losses: 2, played: 14}
    },
    "Vivi朝酒晚舞": {
        1: {wins: 9, losses: 5, played: 14}, 2: {wins: 8, losses: 6, played: 14},
        3: {wins: 10, losses: 4, played: 14}, 4: {wins: 12, losses: 2, played: 14},
        5: {wins: 11, losses: 3, played: 14}, 6: {wins: 12, losses: 2, played: 14},
        7: {wins: 9, losses: 5, played: 14}, 8: {wins: 9, losses: 5, played: 14},
        9: {wins: 9, losses: 5, played: 14}, 10: {wins: 11, losses: 3, played: 14},
        11: {wins: 8, losses: 6, played: 14}, 12: {wins: 10, losses: 4, played: 14},
        13: {wins: 9, losses: 5, played: 14}, 14: {wins: 6, losses: 8, played: 14},
        15: {wins: 10, losses: 4, played: 14}, 16: {wins: 9, losses: 5, played: 14}
    },
    "醉販": {
        1: {wins: 8, losses: 6, played: 14}, 2: {wins: 9, losses: 5, played: 14},
        3: {wins: 7, losses: 7, played: 14}, 4: {wins: 8, losses: 6, played: 14},
        5: {wins: 6, losses: 8, played: 14}, 6: {wins: 7, losses: 7, played: 14},
        7: {wins: 8, losses: 6, played: 14}, 8: {wins: 6, losses: 8, played: 14},
        9: {wins: 9, losses: 5, played: 14}, 10: {wins: 7, losses: 7, played: 14},
        11: {wins: 9, losses: 5, played: 14}, 12: {wins: 7, losses: 7, played: 14},
        13: {wins: 8, losses: 6, played: 14}, 14: {wins: 7, losses: 7, played: 14},
        15: {wins: 6, losses: 8, played: 14}, 16: {wins: 8, losses: 6, played: 14}
    },
    "酒空組": {
        1: {wins: 6, losses: 8, played: 14}, 2: {wins: 7, losses: 7, played: 14},
        3: {wins: 6, losses: 8, played: 14}, 4: {wins: 8, losses: 6, played: 14},
        5: {wins: 7, losses: 7, played: 14}, 6: {wins: 6, losses: 8, played: 14},
        7: {wins: 5, losses: 9, played: 14}, 8: {wins: 7, losses: 7, played: 14},
        9: {wins: 8, losses: 6, played: 14}, 10: {wins: 6, losses: 8, played: 14},
        11: {wins: 8, losses: 6, played: 14}, 12: {wins: 6, losses: 8, played: 14},
        13: {wins: 7, losses: 7, played: 14}, 14: {wins: 9, losses: 5, played: 14},
        15: {wins: 5, losses: 9, played: 14}, 16: {wins: 6, losses: 8, played: 14}
    },
    "逃生入口A": {
        1: {wins: 8, losses: 6, played: 14}, 2: {wins: 6, losses: 8, played: 14},
        3: {wins: 5, losses: 9, played: 14}, 4: {wins: 5, losses: 9, played: 14},
        5: {wins: 5, losses: 9, played: 14}, 6: {wins: 6, losses: 8, played: 14},
        7: {wins: 6, losses: 8, played: 14}, 8: {wins: 8, losses: 6, played: 14},
        9: {wins: 7, losses: 7, played: 14}, 10: {wins: 3, losses: 11, played: 14},
        11: {wins: 9, losses: 5, played: 14}, 12: {wins: 8, losses: 6, played: 14},
        13: {wins: 7, losses: 7, played: 14}, 14: {wins: 5, losses: 9, played: 14},
        15: {wins: 9, losses: 5, played: 14}, 16: {wins: 5, losses: 9, played: 14}
    },
    "逃生入口C": {
        1: {wins: 5, losses: 9, played: 14}, 2: {wins: 6, losses: 8, played: 14},
        3: {wins: 7, losses: 7, played: 14}, 4: {wins: 6, losses: 8, played: 14},
        5: {wins: 3, losses: 11, played: 14}, 6: {wins: 4, losses: 10, played: 14},
        7: {wins: 6, losses: 8, played: 14}, 8: {wins: 6, losses: 8, played: 14},
        9: {wins: 8, losses: 6, played: 14}, 10: {wins: 9, losses: 5, played: 14},
        11: {wins: 3, losses: 11, played: 14}, 12: {wins: 9, losses: 5, played: 14},
        13: {wins: 5, losses: 9, played: 14}, 14: {wins: 12, losses: 2, played: 14},
        15: {wins: 6, losses: 8, played: 14}, 16: {wins: 6, losses: 8, played: 14}
    },
    "Jack": {
        1: {wins: 4, losses: 10, played: 14}, 2: {wins: 3, losses: 11, played: 14},
        3: {wins: 5, losses: 9, played: 14}, 4: {wins: 6, losses: 8, played: 14},
        5: {wins: 4, losses: 10, played: 14}, 6: {wins: 5, losses: 9, played: 14},
        7: {wins: 4, losses: 10, played: 14}, 8: {wins: 4, losses: 10, played: 14},
        9: {wins: 3, losses: 11, played: 14}, 10: {wins: 2, losses: 12, played: 14},
        11: {wins: 6, losses: 8, played: 14}, 12: {wins: 4, losses: 10, played: 14},
        13: {wins: 4, losses: 10, played: 14}, 14: {wins: 3, losses: 11, played: 14},
        15: {wins: 4, losses: 10, played: 14}, 16: {wins: 3, losses: 11, played: 14}
    },
    "人生揪難": {
        1: {wins: 2, losses: 12, played: 14}, 2: {wins: 2, losses: 12, played: 14},
        3: {wins: 0, losses: 14, played: 14}, 4: {wins: 0, losses: 14, played: 14},
        5: {wins: 5, losses: 9, played: 14}, 6: {wins: 2, losses: 12, played: 14},
        7: {wins: 1, losses: 13, played: 14}, 8: {wins: 1, losses: 13, played: 14},
        9: {wins: 2, losses: 12, played: 14}, 10: {wins: 4, losses: 10, played: 14},
        11: {wins: 2, losses: 12, played: 14}, 12: {wins: 3, losses: 11, played: 14},
        13: {wins: 2, losses: 12, played: 14}, 14: {wins: 1, losses: 13, played: 14},
        15: {wins: 1, losses: 13, played: 14}, 16: {wins: 2, losses: 12, played: 14}
    }
};

// 根據當前頁面URL獲取隊伍名稱
function getCurrentTeamName() {
    const path = window.location.pathname;
    if (path.includes('pirate.html')) return '海盜揪硬';
    if (path.includes('vivi.html')) return 'Vivi朝酒晚舞';
    if (path.includes('drunk-vendor.html')) return '醉販';
    if (path.includes('jiukong.html')) return '酒空組';
    if (path.includes('exit-a.html')) return '逃生入口A';
    if (path.includes('exit-c.html')) return '逃生入口C';
    if (path.includes('jack.html')) return 'Jack';
    if (path.includes('life-hard.html')) return '人生揪難';
    return null;
}

// 初始化隊伍詳細頁面
function initializeTeamDetail(topPlayersData) {
    currentTopPlayersData = topPlayersData;
    // 初始化SET分析表格
    initializeSetAnalysisTable();
}

// 初始化SET分析表格
function initializeSetAnalysisTable() {
    const tableBody = document.getElementById('setAnalysisBody');
    if (!tableBody) {
        console.log('找不到setAnalysisBody元素');
        return;
    }
    
    const teamName = getCurrentTeamName();
    if (!teamName || !teamSetStats[teamName]) {
        console.log('找不到隊伍統計數據:', teamName);
        return;
    }
    
    // 清空現有內容
    tableBody.innerHTML = '';
    
    const teamStats = teamSetStats[teamName];
    
    // 為每個SET生成表格行
    for (let setNum = 1; setNum <= 16; setNum++) {
        const row = document.createElement('tr');
        const setData = teamStats[setNum];
        
        // 計算勝率（排除和局）
        const winRate = setData.played > 0 ? Math.round((setData.wins / setData.played) * 100) : 0;
        const barColor = getBarColor(winRate);
        
        // 獲取該SET的排行榜數據
        const topPlayers = currentTopPlayersData && currentTopPlayersData[setNum.toString()] ? 
                          currentTopPlayersData[setNum.toString()] : [];
        
        row.innerHTML = `
            <td>
                <div class="set-info">
                    <div class="set-number">SET${setNum}</div>
                    <div class="set-type">${setTypes[setNum] || '未知項目'}</div>
                </div>
            </td>
            <td class="stat-cell">
                <div class="stat-numbers">
                    <div class="stat-line">出賽: ${setData.played}</div>
                    <div class="stat-line">勝場: ${setData.wins}</div>
                    <div class="stat-line">勝率: ${winRate}%</div>
                </div>
            </td>
            <td class="bar-cell">
                <div class="win-rate-display">
                    <div class="win-rate-bar">
                        <div class="bar-fill" style="width: ${Math.max(winRate, 5)}%; background-color: ${barColor};">
                        </div>
                        <span class="bar-text">${winRate}%</span>
                    </div>
                </div>
            </td>
            <td class="top-players-cell">
                <div class="top-players">
                    ${getTopPlayersForSet(topPlayers)}
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    }
}

// 根據勝率獲取長條圖顏色
function getBarColor(winRate) {
    if (winRate >= 80) return '#28a745';  // 綠色 - 優秀
    if (winRate >= 60) return '#ffc107';  // 黃色 - 良好
    if (winRate >= 40) return '#ff9800';  // 橙色 - 普通
    return '#dc3545';                     // 紅色 - 需改善
}

// 獲取指定SET的TOP3選手顯示
function getTopPlayersForSet(topPlayers) {
    if (!topPlayers || topPlayers.length === 0) {
        return '<span class="no-data">暫無數據</span>';
    }
    
    return topPlayers.slice(0, 3).map((playerName, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        return `<div class="top-player">
            <span class="medal">${medal}</span>
            <span class="player-name">${playerName}</span>
        </div>`;
    }).join('');
}

// 初始化SET圖表
function initializeSetChart(setData) {
    const ctx = document.getElementById('setChart').getContext('2d');
    
    // 如果已有圖表，先銷毀
    if (setChart) {
        setChart.destroy();
    }
    
    const labels = setData.map(data => `SET${data.set}`);
    const winRates = setData.map(data => data.winRate);
    
    setChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '勝率 (%)',
                data: winRates,
                backgroundColor: winRates.map(rate => {
                    if (rate >= 80) return 'rgba(40, 167, 69, 0.8)';  // 綠色 - 優秀
                    if (rate >= 60) return 'rgba(255, 193, 7, 0.8)';   // 黃色 - 良好
                    if (rate >= 40) return 'rgba(255, 152, 0, 0.8)';   // 橙色 - 普通
                    return 'rgba(220, 53, 69, 0.8)';                   // 紅色 - 需改善
                }),
                borderColor: winRates.map(rate => {
                    if (rate >= 80) return 'rgba(40, 167, 69, 1)';
                    if (rate >= 60) return 'rgba(255, 193, 7, 1)';
                    if (rate >= 40) return 'rgba(255, 152, 0, 1)';
                    return 'rgba(220, 53, 69, 1)';
                }),
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'SET 1-16 勝率表現',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                },
                                 tooltip: {
                     callbacks: {
                         label: function(context) {
                             const dataIndex = context.dataIndex;
                             const currentSetData = setData[dataIndex];
                             return [
                                 `勝率: ${context.parsed.y.toFixed(1)}%`,
                                 `勝場: ${currentSetData.won}/${currentSetData.played}`
                             ];
                         }
                     }
                 }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: '勝率 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'SET'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// 響應式處理
window.addEventListener('resize', () => {
    if (setChart) {
        setChart.resize();
    }
});

// 頁面加載完成後的初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('隊伍詳細頁面已加載');
}); 