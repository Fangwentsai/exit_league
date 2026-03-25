// 立即執行的測試
console.log('news.js 已載入');

// 移除干擾的標籤按鈕
function removeInterfereingTags() {
    console.log('🔍 檢查並移除干擾標籤...');

    // 1. 直接移除 Google AdSense 自動標籤
    const googleAnnoElements = document.querySelectorAll('.google-anno-skip, .google-anno-sc, [class*="google-anno"]');
    googleAnnoElements.forEach(element => {
        console.log('移除 Google AdSense 標籤:', element);
        element.style.display = 'none !important';
        element.style.visibility = 'hidden !important';
        element.remove(); // 直接移除元素
    });

    // 2. 移除包含特定文字的藍色按鈕元素
    const interfereingTexts = ['飛鏢運動服', '飛鏢配件'];

    interfereingTexts.forEach(text => {
        // 使用更精確的選擇器
        const elements = document.querySelectorAll(`
            .news-section *,
            .news-item *,
            .news-header *,
            div[style*="background-color: rgb(0, 123, 255)"],
            div[style*="background: rgb(0, 123, 255)"],
            span[style*="background-color: rgb(0, 123, 255)"],
            button[style*="background-color: rgb(0, 123, 255)"]
        `);

        elements.forEach(element => {
            if (element.textContent && element.textContent.trim() === text) {
                console.log('移除干擾標籤:', text, element);
                element.style.display = 'none !important';
                element.style.visibility = 'hidden !important';
                element.remove(); // 直接移除元素
            }
        });
    });

    // 3. 移除任何包含這些文字的小型元素（可能是動態生成的）
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        if (element.textContent &&
            (element.textContent.trim() === '飛鏢運動服' || element.textContent.trim() === '飛鏢配件')) {
            const rect = element.getBoundingClientRect();
            // 如果是小型元素（可能是標籤按鈕）
            if (rect.width < 150 && rect.height < 50 && rect.width > 0) {
                console.log('移除小型干擾元素:', element.textContent.trim(), element);
                element.style.display = 'none !important';
                element.style.visibility = 'hidden !important';
                element.remove();
            }
        }
    });
}

// 定期檢查並移除干擾標籤（因為它們可能是動態生成的）
function startTagRemovalMonitor() {
    console.log('🚀 啟動標籤移除監控');

    // 立即執行一次
    removeInterfereingTags();

    // 更頻繁地檢查（每1秒一次）
    setInterval(removeInterfereingTags, 1000);

    // 監聽DOM變化
    const observer = new MutationObserver(function (mutations) {
        let hasNewElements = false;
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length > 0) {
                // 檢查是否有新增的元素包含我們要移除的類別或文字
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && (
                            node.classList.contains('google-anno-skip') ||
                            node.classList.contains('google-anno-sc') ||
                            node.className.includes('google-anno')
                        )) {
                            hasNewElements = true;
                        }

                        // 檢查是否包含干擾文字
                        if (node.textContent && (
                            node.textContent.includes('飛鏢運動服') ||
                            node.textContent.includes('飛鏢配件')
                        )) {
                            hasNewElements = true;
                        }
                    }
                });
            }
        });

        if (hasNewElements) {
            console.log('🔄 檢測到新的可能干擾元素，執行清理');
            setTimeout(removeInterfereingTags, 50);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });

    // 也監聽頁面載入完成事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(removeInterfereingTags, 500);
        });
    }

    // 監聽頁面完全載入
    window.addEventListener('load', function () {
        setTimeout(removeInterfereingTags, 1000);
    });
}

// 新聞折疊功能
function toggleNews(headerElement) {
    console.log('toggleNews 被調用', headerElement);
    const newsItem = headerElement.parentElement;
    const newsText = newsItem.querySelector('.news-text');

    console.log('newsItem:', newsItem);
    console.log('newsText:', newsText);
    console.log('newsText classes before:', newsText.className);

    if (newsText.classList.contains('collapsed')) {
        // 展開
        console.log('展開新聞');
        newsText.classList.remove('collapsed');
        newsText.classList.add('expanded');
        headerElement.classList.add('expanded');
    } else {
        // 折疊
        console.log('折疊新聞');
        newsText.classList.remove('expanded');
        newsText.classList.add('collapsed');
        headerElement.classList.remove('expanded');
    }

    console.log('newsText classes after:', newsText.className);
    console.log('headerElement classes after:', headerElement.className);
}

// 初始化新聞折疊功能
function initializeNewsToggle() {
    console.log('🔄 開始初始化新聞折疊功能');
    console.log('當前頁面 URL:', window.location.href);
    console.log('當前頁面內容區域:', document.getElementById('contentArea'));

    // 檢查是否在正確的頁面（contentArea 是可選的）
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) {
        console.log('⚠️ 找不到 contentArea，但繼續初始化（可能是獨立新聞頁面）');
    }

    // 使用 requestIdleCallback 延遲初始化，改善 TBT
    const initTask = () => {
        console.log('⏳ 延遲後開始初始化...');

        // 移除之前的事件監聽器
        const existingHeaders = document.querySelectorAll('.news-header');
        console.log('🔍 找到現有新聞標題數量:', existingHeaders.length);

        existingHeaders.forEach((header, index) => {
            console.log(`📰 處理第${index + 1}個新聞標題:`, header.querySelector('.news-title')?.textContent);
            header.replaceWith(header.cloneNode(true));
        });

        // 重新查詢新聞標題
        const newsHeaders = document.querySelectorAll('.news-header');
        console.log('✅ 重新查詢到新聞標題數量:', newsHeaders.length);

        if (newsHeaders.length === 0) {
            console.log('❌ 沒有找到任何新聞標題，可能頁面還未載入完成');
            return;
        }

        newsHeaders.forEach((header, index) => {
            console.log(`🖱️ 為第${index + 1}個新聞標題添加點擊事件`);
            header.addEventListener('click', function (event) {
                console.log(`🖱️ 點擊了第${index + 1}個新聞標題`, event);
                event.preventDefault();
                event.stopPropagation();
                toggleNews(this);
            });
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none'; // 防止文字選取
        });

        // 為第一篇新聞預設展開
        const firstNews = document.querySelector('.news-item.collapsible .news-header');
        if (firstNews) {
            console.log('🚀 準備展開第一篇新聞');
            setTimeout(() => {
                toggleNews(firstNews);
            }, 100);
        } else {
            console.log('❌ 找不到第一篇新聞');
        }

        console.log('✅ 新聞折疊功能初始化完成');
    };

    // 使用 requestIdleCallback 或 setTimeout
    if ('requestIdleCallback' in window) {
        requestIdleCallback(initTask, { timeout: 500 });
    } else {
        setTimeout(initTask, 200);
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function () {
    initializeNewsToggle();
    startTagRemovalMonitor(); // 啟動標籤移除監控
});

// 當內容動態載入時也要重新初始化
window.initializeNewsToggle = initializeNewsToggle;

// 確保函數可以全域訪問
window.toggleNews = toggleNews;

async function loadMatches() {
    try {
        console.log('開始載入比賽數據...');

        // 使用 requestIdleCallback 延遲執行以改善 TBT
        if ('requestIdleCallback' in window) {
            await new Promise(resolve => {
                requestIdleCallback(() => resolve(), { timeout: 2000 });
            });
        }

        // 首先嘗試從API獲取數據
        let response = null;
        let data = null;
        let fetchError = null;

        try {
            // 使用第六屆的 Google Sheet API取得數據
            const sheetId = CONFIG.SEASON6.SHEET_ID; // Season 6的Sheet ID
            const apiKey = CONFIG.SEASON6.API_KEY;
            const gsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/schedule!O:V?key=${apiKey}`;

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

                // O:V 欄位格式: O=日期, P=比賽號碼, Q=客隊, R=客隊分數, S=主隊分數, T=主隊, U=場地, V=其他資訊
                rawData.values.forEach(row => {
                    // 檢查至少要有日期和隊伍資訊（至少6欄，但可以容忍空分數）
                    if (row.length >= 5 && row[0] && row[2] && row[5]) {
                        const date = row[0] ? row[0].trim() : '';        // O欄 - 日期
                        const gameNumber = row[1] ? row[1].trim() : '';  // P欄 - 比賽號碼
                        const awayTeam = row[2] ? row[2].trim().replace(/\r?\n|\r/g, "") : '';    // Q欄 - 客隊
                        const awayScore = row[3] ? row[3].trim() : '';   // R欄 - 客隊分數
                        const homeScore = row[4] ? row[4].trim() : '';   // S欄 - 主隊分數
                        const homeTeam = row[5] ? row[5].trim().replace(/\r?\n|\r/g, "") : '';    // T欄 - 主隊
                        const venue = row[6] ? row[6].trim() : '';       // U欄 - 場地

                        // 必須有日期、客隊和主隊才算有效的比賽
                        if (!date || !awayTeam || !homeTeam) {
                            console.log('跳過無效行（缺少必要資訊）:', row);
                            return;
                        }

                        // 組合隊伍名稱和分數
                        const team1 = awayTeam + (awayScore ? ` ${awayScore}` : '');
                        const team2 = (homeScore ? `${homeScore} ` : '') + homeTeam + (venue ? ` (${venue})` : '');

                        // 如果日期變了，創建新的比賽日
                        if (date && date !== currentDate) {
                            if (currentDate && currentGames.length > 0) {
                                data.schedule.push({
                                    date: currentDate,
                                    games: [...currentGames]
                                });
                                console.log(`添加比賽日 ${currentDate}，包含 ${currentGames.length} 場比賽`);
                            }
                            currentDate = date;
                            currentGames = [];
                        }

                        // 添加比賽到當前日期（有日期和隊伍就算有效，gameNumber 可以為空）
                        const gameObj = {
                            game_number: gameNumber || `g${currentGames.length + 1}`,
                            team1: team1,
                            team2: team2,
                            venue: venue
                        };
                        currentGames.push(gameObj);
                        console.log(`添加比賽: ${gameObj.game_number} - ${team1} vs ${team2}`);
                    }
                });

                // 添加最後一組數據
                if (currentDate && currentGames.length > 0) {
                    data.schedule.push({
                        date: currentDate,
                        games: [...currentGames]
                    });
                    console.log(`添加最後比賽日 ${currentDate}，包含 ${currentGames.length} 場比賽`);
                }

                // 輸出每個比賽日的比賽數量
                data.schedule.forEach(schedule => {
                    console.log(`比賽日 ${schedule.date} 共有 ${schedule.games.length} 場比賽`);
                });

                console.log('處理後的API數據:', data);
            } else {
                throw new Error('API返回的數據格式不符合預期');
            }
        } catch (apiError) {
            console.error('從API獲取數據失敗，嘗試使用本地JSON:', apiError);
            fetchError = apiError;

            // API獲取失敗，嘗試使用本地JSON文件
            const url = '/data/schedule_s5.json';
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
            console.log(`上週比賽日期: ${lastMatch.date}，共有 ${lastMatch.games ? lastMatch.games.length : 0} 場比賽`);
            if (lastMatch.games && lastMatch.games.length > 0) {
                const lastWeekHTML = createMatchesHTML(lastMatch);
                console.log('生成的上週比賽 HTML:', lastWeekHTML);
                document.getElementById('lastWeekMatchesContent').innerHTML = lastWeekHTML;
            } else {
                document.getElementById('lastWeekMatchesContent').innerHTML = '<p>上週比賽日沒有比賽數據</p>';
            }
        } else {
            document.getElementById('lastWeekMatchesContent').innerHTML = '<p>沒有上週的比賽記錄</p>';
        }

        // 顯示下週比賽
        if (nextMatch) {
            console.log(`近期比賽日期: ${nextMatch.date}，共有 ${nextMatch.games ? nextMatch.games.length : 0} 場比賽`);
            if (nextMatch.games && nextMatch.games.length > 0) {
                const nextWeekHTML = createMatchesHTML(nextMatch);
                console.log('生成的近期比賽 HTML:', nextWeekHTML);
                document.getElementById('upcomingMatchesContent').innerHTML = nextWeekHTML;
            } else {
                document.getElementById('upcomingMatchesContent').innerHTML = '<p>近期比賽日沒有比賽數據</p>';
            }
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

        // 獲取比賽場地 - 優先使用 game.venue，其次從隊伍資訊中提取
        let venueText = '';
        if (game.venue) {
            venueText = game.venue;
        } else if (team1Info.venue) {
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
        const clickAttr = hasScores ? `onclick="showMatchDetails('../game_result/season6/${game.game_number}.html')"` : '';
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

// 確保 DOM 載入完成後才執行，使用 requestIdleCallback 優化 TBT
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 已載入，準備執行 loadMatches');

    // 延遲載入比賽數據，不阻塞主執行緒
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            loadMatches();
        }, { timeout: 1000 });
    } else {
        // 降級方案
        setTimeout(() => {
            loadMatches();
        }, 100);
    }
});

// ========== 第五季成績公告 Modal 函數 ==========
window.openS5RewardModal = function () {
    console.log('✅ [DEBUG] openS5RewardModal 被調用');
    const modal = document.getElementById('s5RewardModal');
    if (!modal) {
        console.error('找不到 s5RewardModal');
        return;
    }
    window.savedScrollPosition = window.scrollY;
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
};

window.closeS5RewardModal = function () {
    console.log('✅ [DEBUG] closeS5RewardModal 被調用');
    const modal = document.getElementById('s5RewardModal');
    if (!modal) return;
    modal.classList.remove('visible');
    document.body.style.overflow = '';
    setTimeout(() => {
        modal.style.display = 'none';
        if (window.savedScrollPosition !== undefined) {
            window.scrollTo(0, window.savedScrollPosition);
        }
    }, 300);
};

// ESC鍵關閉 S5Reward Modal
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('s5RewardModal');
        if (modal && modal.classList.contains('visible')) {
            closeS5RewardModal();
        }
        // 也處理比賽詳情模態框
        const matchModal = document.querySelector('.match-modal');
        if (matchModal) {
            closeMatchModal(matchModal);
        }
    }
});

// ========== 比賽詳情 Modal（news.html 專用）==========
// news.html 不載入 main.js，所以需要獨立定義此函數
// 使用 fetch + inject（不使用 iframe，解決手機滾動與關閉問題）
function showMatchDetails(gameUrl) {
    console.log('✅ [news.js] showMatchDetails (fetch 版本):', gameUrl);

    var existingModal = document.getElementById('matchDetailOverlay');
    if (existingModal) existingModal.remove();

    var overlay = document.createElement('div');
    overlay.id = 'matchDetailOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10002;display:flex;justify-content:center;align-items:center;padding:10px;opacity:0;visibility:hidden;transition:opacity 0.3s ease,visibility 0.3s ease;';

    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:12px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.3);-webkit-overflow-scrolling:touch;position:relative;';
    card.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">載入中...</div>';

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
    });

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeDetailOverlay(overlay);
    });

    function onEsc(e) {
        if (e.key === 'Escape') { _closeDetailOverlay(overlay); document.removeEventListener('keydown', onEsc); }
    }
    document.addEventListener('keydown', onEsc);

    fetch(gameUrl)
        .then(function (resp) {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.text();
        })
        .then(function (html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            // 取出 CSS 連結
            var cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
            cssLinks.forEach(function (link) {
                var href = link.getAttribute('href');
                if (href && href.includes('game_result.css') && !document.querySelector('link[href*="game_result.css"]')) {
                    var newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    
                    // 統一轉為從根目錄出發的絕對路徑
                    // news.html 在 pages 資料夾下，所以需要回到上一層
                    newLink.href = '../styles/common/game_result.css';
                    document.head.appendChild(newLink);
                }
            });

            // 建立關閉按鈕，改回原本的浮動樣式 (絕對定位於 modalContent 右上角)
            var closeHtml = '<button id="matchDetailCloseBtn" style="position:absolute;top:-12px;right:-12px;width:30px;height:30px;font-size:20px;display:flex;justify-content:center;align-items:center;background:#f44336;color:#fff;border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.3);z-index:10005;">✕</button>';

            card.style.overflow = 'visible'; // 讓按鈕可以超出卡片邊界
            var contentWrap = '<div style="width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:12px;">' + doc.body.innerHTML + '</div>';
            card.innerHTML = closeHtml + contentWrap;

            var closeBtn = document.getElementById('matchDetailCloseBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    _closeDetailOverlay(overlay);
                });
            }

            var scripts = doc.querySelectorAll('script');
            scripts.forEach(function (s) {
                if (s.textContent && !s.src) {
                    try { new Function(s.textContent)(); } catch (err) { console.warn('script err:', err); }
                }
            });
        })
        .catch(function (err) {
            console.error('載入失敗:', err);
            card.innerHTML = '<div style="padding:30px;text-align:center;"><h3>載入失敗</h3><p>' + err.message + '</p><a href="' + gameUrl + '" target="_blank" style="color:#dc3545;">在新分頁開啟</a></div>';
        });
}

function _closeDetailOverlay(overlay) {
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    document.body.style.overflow = '';
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 300);
}