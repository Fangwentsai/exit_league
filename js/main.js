// main.js v2.0 - 已修復季後賽模態窗口衝突問題 (2025-11-19)
// 修复未关闭的模板字符串
// 配置信息
console.log('🚀 main.js v2.0 已載入 - 修復版本');

// ==================== 全局函數：Playoffs 模態窗口 ====================
// 這些函數需要在全局作用域，供 HTML onclick 使用
var scrollPosition = 0;

window.openPlayoffsModal = function() {
    console.log('✅ [main.js] openPlayoffsModal 被調用');
    const modal = document.getElementById('playoffsModal');
    if (!modal) {
        console.log('❌ 找不到 playoffsModal');
        return;
    }
    
    // 保存當前滾動位置
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    console.log('💾 保存滾動位置:', scrollPosition);
    
    // 防止背景滾動
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';
    
    // 顯示模態窗口
    modal.classList.add('visible');
    
    // ⭐ 關鍵修復：強制保持滾動位置（防止焦點跳動）
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
        console.log('✅ Playoffs 模態窗口已打開，滾動位置已鎖定在:', scrollPosition);
    });
};

window.closePlayoffsModal = function() {
    console.log('✅ [main.js] closePlayoffsModal 被調用');
    const modal = document.getElementById('playoffsModal');
    if (!modal) return;
    
    // 隱藏模態窗口
    modal.classList.remove('visible');
    
    // 恢復背景滾動
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    console.log('✅ Playoffs 模態窗口已關閉，滾動位置保持在:', window.pageYOffset);
};

// ==================== 全局函數：Reward 模態窗口 ====================
window.openRewardModal = function() {
    console.log('✅ [main.js] openRewardModal 被調用');
    const modal = document.getElementById('rewardModal');
    if (!modal) {
        console.log('❌ 找不到 rewardModal');
        return;
    }
    
    // 保存當前滾動位置
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    console.log('💾 保存滾動位置:', scrollPosition);
    
    // 防止背景滾動
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';
    
    // 顯示模態窗口
    modal.classList.add('visible');
    
    // ⭐ 關鍵修復：強制保持滾動位置（防止焦點跳動）
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
        console.log('✅ Reward 模態窗口已打開，滾動位置已鎖定在:', scrollPosition);
    });
};

window.closeRewardModal = function() {
    console.log('✅ [main.js] closeRewardModal 被調用');
    const modal = document.getElementById('rewardModal');
    if (!modal) return;
    
    // 隱藏模態窗口
    modal.classList.remove('visible');
    
    // 恢復背景滾動
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    console.log('✅ Reward 模態窗口已關閉，滾動位置保持在:', window.pageYOffset);
};

// ESC鍵關閉模態窗口
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const playoffsModal = document.getElementById('playoffsModal');
        const rewardModal = document.getElementById('rewardModal');
        if (playoffsModal && playoffsModal.classList.contains('visible')) {
            window.closePlayoffsModal();
        }
        if (rewardModal && rewardModal.classList.contains('visible')) {
            window.closeRewardModal();
        }
    }
});

console.log('✅ Playoffs 和 Reward 模態窗口函數已註冊到全局');
const CONFIG = {
    SEASON3: {
        SHEET_ID: '1Rjxr6rT_NfonXtYYsxpo3caYJbvI-fxc2WQh3tKBSC8',
        API_KEY: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
        SEASON_FILTER: '3'
    },
    SEASON4: {
        SHEET_ID: '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE',
        API_KEY: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
        SEASON_FILTER: '4'
    },
    SEASON5: {
        SHEET_ID: '1xb6UmcQ4ueQcCn_dHW8JJ9H2Ya2Mp94HdJqz90BlEEY',
        API_KEY: 'AIzaSyDtba1arudetdcnc3yd3ri7Q35HlAndjr0',
        SEASON_FILTER: '5'
    },
    SEASON6: {
        SHEET_ID: '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM',
        API_KEY: 'AIzaSyC-FZGPTfchBh2FQGGc8KyLEX1ZDxmadX4',
        SEASON_FILTER: '6'
    }
};

// 添加一個全局變量來控制是否顯示調試日誌
const DEBUG_MODE = true;

// 定義一個調試日誌函數
function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// ==================== 新聞折疊功能 ====================

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
    
    // 檢查是否在正確的頁面
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) {
        console.log('❌ 找不到 contentArea，初始化失敗');
        return;
    }
    
    // 等待一下確保 DOM 完全載入
    setTimeout(() => {
        console.log('⏳ 延遲後開始初始化...');
        
        // 查詢新聞標題
        const newsHeaders = document.querySelectorAll('.news-header');
        console.log('🔍 找到新聞標題數量:', newsHeaders.length);
        
        if (newsHeaders.length === 0) {
            console.log('❌ 沒有找到任何新聞標題，可能頁面還未載入完成');
            // 再試一次，從 contentArea 內部查找
            const contentNewsHeaders = contentArea.querySelectorAll('.news-header');
            console.log('🔍 從 contentArea 查找到新聞標題數量:', contentNewsHeaders.length);
            if (contentNewsHeaders.length === 0) {
                return;
            }
            // 使用從 contentArea 找到的標題
            contentNewsHeaders.forEach((header, index) => {
                console.log(`🖱️ 為第${index+1}個新聞標題添加點擊事件`);
                header.addEventListener('click', function(event) {
                    console.log(`🖱️ 點擊了第${index+1}個新聞標題`, event);
                    event.preventDefault();
                    event.stopPropagation();
                    toggleNews(this);
                });
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
            });
            
            // 不再自動展開第一篇新聞
            console.log('📰 新聞折疊功能設置完成，等待用戶手動點擊');
            return;
        }
        
        newsHeaders.forEach((header, index) => {
            console.log(`🖱️ 為第${index+1}個新聞標題添加點擊事件`);
            header.addEventListener('click', function(event) {
                console.log(`🖱️ 點擊了第${index+1}個新聞標題`, event);
                event.preventDefault();
                event.stopPropagation();
                toggleNews(this);
            });
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none'; // 防止文字選取
        });
        
        // 不再自動展開第一篇新聞
        console.log('📰 新聞折疊功能設置完成，等待用戶手動點擊');
        
        console.log('✅ 新聞折疊功能初始化完成');
    }, 200);
}

// 比賽區塊折疊切換功能
function toggleMatches(headerElement) {
    console.log('toggleMatches 被調用', headerElement);
    const matchesItem = headerElement.parentElement;
    const matchesContent = matchesItem.querySelector('.matches-content');
    
    if (!matchesContent) {
        console.error('找不到比賽內容區域');
        return;
    }
    
    const isExpanded = matchesContent.classList.contains('expanded');
    console.log('當前展開狀態:', isExpanded);
    
    if (isExpanded) {
        // 收合
        console.log('收合比賽內容');
        matchesContent.classList.remove('expanded');
        matchesContent.classList.add('collapsed');
        headerElement.classList.remove('expanded');
    } else {
        // 展開
        console.log('展開比賽內容');
        matchesContent.classList.remove('collapsed');
        matchesContent.classList.add('expanded');
        headerElement.classList.add('expanded');
    }
}

// 初始化比賽折疊功能
function initializeMatchesToggle() {
    console.log('🔄 開始初始化比賽折疊功能');
    
    // 等待一下確保 DOM 完全載入
    setTimeout(() => {
        console.log('⏳ 延遲後開始初始化比賽折疊...');
        
        const matchesHeaders = document.querySelectorAll('.matches-header');
        console.log('🔍 找到比賽標題數量:', matchesHeaders.length);
        
        if (matchesHeaders.length === 0) {
            console.log('❌ 沒有找到任何比賽標題');
            return;
        }
        
        matchesHeaders.forEach((header, index) => {
            console.log(`🖱️ 為第${index+1}個比賽標題添加點擊事件`);
            header.addEventListener('click', function(event) {
                console.log(`🖱️ 點擊了第${index+1}個比賽標題`, event);
                event.preventDefault();
                event.stopPropagation();
                toggleMatches(this);
            });
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
        });
        
        console.log('🏆 比賽折疊功能設置完成，等待用戶手動點擊');
        console.log('✅ 比賽折疊功能初始化完成');
    }, 300);
}

// 調試輸出
// console.log('CONFIG 對象已加載');
// console.log('CONFIG.SEASON3:', CONFIG.SEASON3);
// console.log('CONFIG.SEASON4:', CONFIG.SEASON4);

// 頁面載入完成後自動初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded 事件觸發 ===');
    console.log('當前頁面路徑:', window.location.pathname);
    console.log('seasonOverride:', typeof seasonOverride !== 'undefined' ? seasonOverride : '未定義');
    
    // 檢查是否為獨立的賽程頁面
    const currentPath = window.location.pathname;
    if (currentPath.includes('schedule.html')) {
        console.log('檢測到獨立的 schedule.html 頁面，開始載入第三屆資料');
        // 確保 seasonOverride 已設定
        if (typeof seasonOverride === 'undefined') {
            window.seasonOverride = 's3';
        }
        // 延遲執行以確保所有腳本都已載入
        setTimeout(() => {
            loadScheduleData('schedule');
        }, 500);
    } else if (currentPath.includes('scheduleS4.html')) {
        console.log('檢測到獨立的 scheduleS4.html 頁面，開始載入第四屆資料');
        if (typeof seasonOverride === 'undefined') {
            window.seasonOverride = 's4';
        }
        setTimeout(() => {
            loadScheduleData('scheduleS4');
        }, 500);
    } else if (currentPath.includes('scheduleS5.html')) {
        console.log('檢測到獨立的 scheduleS5.html 頁面，開始載入第五屆資料');
        if (typeof seasonOverride === 'undefined') {
            window.seasonOverride = 's5';
        }
        setTimeout(() => {
            loadScheduleData('scheduleS5');
        }, 500);
    } else if (currentPath.includes('scheduleS6.html')) {
        console.log('檢測到獨立的 scheduleS6.html 頁面，開始載入第六屆資料');
        if (typeof seasonOverride === 'undefined') {
            window.seasonOverride = 's6';
        }
        setTimeout(() => {
            loadScheduleData('scheduleS6');
        }, 500);
    }
});

// 漢堡選單處理
function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    function closeAllSubmenus() {
        document.querySelectorAll('.sidebar-submenu').forEach(menu => {
            menu.classList.remove('active');
            if (menu.previousElementSibling) {
                menu.previousElementSibling.classList.remove('active');
            }
        });
    }
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            const isClosing = sidebar.classList.contains('active');
            hamburger.classList.toggle('active');
            sidebar.classList.toggle('active');
            if (overlay) {
                overlay.classList.toggle('active');
            }
            
            // 如果是關閉側邊欄，同時關閉所有子目錄
            if (isClosing) {
                closeAllSubmenus();
            }
        });

        // 點擊遮罩層時關閉側邊欄
        if (overlay) {
            overlay.addEventListener('click', () => {
                hamburger.classList.remove('active');
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                closeAllSubmenus();
            });
        }
    }
}

// 設置導航
function setupNavigation() {
    document.querySelectorAll('.sidebar-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const page = this.dataset.page;
            const submenu = this.nextElementSibling;
            const anchor = this.dataset.anchor;
            
            // 檢查是否有子選單
            if (submenu && submenu.classList.contains('sidebar-submenu')) {
                e.preventDefault(); // 阻止頁面切換
                
                // 關閉其他所有子選單
                document.querySelectorAll('.sidebar-submenu').forEach(menu => {
                    if (menu !== submenu) {
                        menu.classList.remove('active');
                        menu.previousElementSibling.classList.remove('active');
                    }
                });
                
                // 切換當前子選單
                this.classList.toggle('active');
                submenu.classList.toggle('active');
            } else if (page) {
                // 如果是一般按鈕，載入對應頁面
                loadContent(page, anchor);
                // 關閉側邊欄和所有子選單
                closeSidebar();
            }
        });
    });

    // 子選單項目的點擊事件
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            const anchor = this.dataset.anchor;
            if (page) {
                loadContent(page, anchor);
                // 關閉側邊欄和所有子選單
                closeSidebar();
            }
        });
    });
}

// 關閉側邊欄和所有子選單的函數
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const hamburger = document.querySelector('.hamburger-btn');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
    
    // 關閉所有子選單
    document.querySelectorAll('.sidebar-submenu').forEach(menu => {
        menu.classList.remove('active');
        if (menu.previousElementSibling) {
            menu.previousElementSibling.classList.remove('active');
        }
    });
}

// 載入內容
async function loadContent(page, anchor = null, pushState = true) {
    debugLog('loadContent 開始:', { page, anchor, pushState });
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    // 停止照片輪播（如果有的話）
    stopCarouselOnPageChange();

    // 顯示載入中
    contentArea.innerHTML = '<div class="loading">載入中...</div>';
    
    // 移除所有預加載的CSS樣式表
    document.querySelectorAll('link[data-preload="true"]').forEach(link => {
        document.head.removeChild(link);
    });

    // 預加載當前頁面所需資源
    await preloadResources(page);

    // 構建頁面路徑
    const pagePath = `pages/${page}.html`;
    debugLog('準備載入頁面:', pagePath);

    // 讀取頁面內容
    fetch(pagePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('頁面載入失敗');
            }
            return response.text();
        })
        .then(html => {
            contentArea.innerHTML = html;
            debugLog('頁面內容已載入');
            
            // 確保標題顏色保持白色
            const mainTitle = document.querySelector('.main-title');
            if (mainTitle) {
                mainTitle.style.color = 'white';
            }
            
            // 根據頁面類型載入不同的數據
            let dataLoadPromise = Promise.resolve();
            if (page === 'news') {
                dataLoadPromise = loadNewsData().then(() => {
                    // 初始化新聞和比賽的折疊功能
                    console.log('📰 新聞頁面載入完成，準備初始化折疊功能');
                    setTimeout(() => {
                        initializeNewsToggle();
                        initializeMatchesToggle();
                        initializePhotoCarousel();
                    }, 300);
                });
            } 
            else if (page === 'rule') {
                dataLoadPromise = loadRuleData();
            }
            else if (page === 'rank' || page === 'rankS4' || page === 'rankS5') {
                dataLoadPromise = loadRankData(page);
            }
            else if (page === 'schedule' || page === 'scheduleS4' || page === 'scheduleS5' || page === 'scheduleS6') {
                dataLoadPromise = loadScheduleData(page);
            }
            else if (page === 'awards') {
                dataLoadPromise = initializeAwardsPage();
            }
            
            // 等待數據載入完成後再處理錨點
            dataLoadPromise.then(() => {
                debugLog('數據載入完成，準備處理錨點');
                // 如果有錨點，滾動到對應位置
                if (anchor) {
                    debugLog('開始處理錨點:', anchor);
                    const scrollToAnchor = () => {
                        const element = document.getElementById(anchor);
                        debugLog('尋找錨點元素:', { 
                            anchor, 
                            elementFound: !!element,
                            elementTop: element?.offsetTop,
                            elementId: element?.id,
                            elementHTML: element?.outerHTML
                        });
                        
                        if (element) {
                            // 只計算真正固定在頂部的元素
                            const fixedElements = Array.from(document.querySelectorAll('header, nav, .fixed-top')).filter(el => 
                                window.getComputedStyle(el).position === 'fixed' && 
                                window.getComputedStyle(el).top === '0px'
                            );
                            
                            // 計算固定元素的總高度
                            const totalFixedHeight = fixedElements.reduce((total, el) => {
                                const rect = el.getBoundingClientRect();
                                return total + (rect.height || 0);
                            }, 0);

                            // 獲取元素的絕對位置
                            let elementPosition = 0;
                            let currentElement = element;
                            
                            while (currentElement) {
                                elementPosition += currentElement.offsetTop;
                                currentElement = currentElement.offsetParent;
                            }

                            // 計算最終滾動位置，額外扣除 65px
                            const scrollPosition = Math.max(0, elementPosition - totalFixedHeight - 65);

                            debugLog('計算滾動位置:', {
                                elementPosition,
                                totalFixedHeight,
                                extraOffset: 65,
                                finalScrollPosition: scrollPosition,
                                fixedElements: fixedElements.length,
                                fixedElementsList: fixedElements.map(el => el.tagName),
                                windowScrollY: window.scrollY,
                                windowInnerHeight: window.innerHeight
                            });

                            window.scrollTo({
                                top: scrollPosition,
                                behavior: 'smooth'
                            });
                            return true;
                        }
                        return false;
                    };

                    // 嘗試多次滾動，確保元素已經載入
                    let attempts = 0;
                    const maxAttempts = 10;
                    const tryScroll = () => {
                        debugLog(`嘗試滾動 第 ${attempts + 1} 次`);
                        if (scrollToAnchor() || attempts >= maxAttempts) {
                            debugLog(attempts >= maxAttempts ? '達到最大嘗試次數' : '成功找到並滾動到錨點');
                            return;
                        }
                        attempts++;
                        setTimeout(tryScroll, 100);
                    };
                    
                    setTimeout(tryScroll, 100);
                }
            });

            // 更新瀏覽器歷史記錄
            if (pushState) {
                // 如果是預設頁面(news)且沒有anchor，不添加hash
                if (page === 'news' && !anchor) {
                    debugLog('預設頁面，不添加hash');
                    history.pushState({ page, anchor }, '', window.location.pathname);
                } else {
                    const url = anchor ? `#${page}/${anchor}` : `#${page}`;
                    debugLog('更新瀏覽器歷史:', url);
                    history.pushState({ page, anchor }, '', url);
                }
            }
        })
        .catch(error => {
            debugLog('載入頁面時發生錯誤:', error);
            contentArea.innerHTML = `<div class="error-message">載入失敗: ${error.message}</div>`;
        });
}

// 更新按鈕狀態
function updateButtonStates(page) {
    document.querySelectorAll('.nav-btn, .sidebar-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });
}

// 顯示錯誤信息
function showError(message) {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="error-message">
            載入失敗，請稍後再試
            <br>
            錯誤訊息：${message}
        </div>
    `;
}

// ========== Google Sheets 新聞頁面數據加載與渲染 ========== //

// 解析日期，支援多種格式：YYYY/M/D, M/D, MM/DD
function parseDate(dateStr) {
    if (!dateStr) return null;
    let parts;
    if (dateStr.includes('/')) {
        parts = dateStr.split('/');
    } else if (dateStr.includes('-')) {
        parts = dateStr.split('-');
    } else if (dateStr.includes('.')) {
        parts = dateStr.split('.');
    } else {
        debugLog('無法解析日期格式:', dateStr);
        return null;
    }
    if (parts.length < 2) {
        debugLog('日期格式不完整:', dateStr);
        return null;
    }
    
    let year, month, day;
    
    if (parts.length === 2) {
        // 格式：M/D 或 MM/DD，使用當前年份
        year = new Date().getFullYear();
        month = parseInt(parts[0], 10) - 1;
        day = parseInt(parts[1], 10);
    } else if (parts.length === 3) {
        // 格式：YYYY/M/D 或 M/D/YYYY
        if (parts[0].length === 4) {
            // YYYY/M/D 格式
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else {
            // M/D/YYYY 格式
            year = parseInt(parts[2], 10);
            month = parseInt(parts[0], 10) - 1;
            day = parseInt(parts[1], 10);
        }
    }
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        debugLog('日期解析失敗:', dateStr);
        return null;
    }
    
    return new Date(year, month, day);
}

function generateMatchesHTML(matches) {
    if (matches.length === 0) {
        return '<p>沒有比賽數據</p>';
    }
    
    // 生成唯一的ID，用於事件綁定
    const uniqueId = 'matches-' + Math.random().toString(36).substr(2, 9);
    
    const matchesByDate = {};
    for (const match of matches) {
        if (!matchesByDate[match.date]) {
            matchesByDate[match.date] = [];
        }
        matchesByDate[match.date].push(match);
    }
    
    let html = `<div id="${uniqueId}">`;
    for (const date in matchesByDate) {
        html += `
            <div class="matches-container">
        `;
        for (const match of matchesByDate[date]) {
            // 判斷比賽是否已完成（有分數）
            const hasScores = match.score1 || match.score2;
            // 提取比賽編號，確保正確格式化
            let gameNumber = match.gameCode.replace(/^[Gg]/, '');
            
            // 生成比賽結果頁面的URL
            let gameResultPath = '';
            
            // 固定使用第五季路徑
            gameResultPath = `game_result/season5/g${gameNumber}.html`;
            
            // 如果有分數，添加可點擊的類和數據屬性
            const dataAttr = hasScores ? `data-game-url="${gameResultPath}"` : '';
            const clickableClass = hasScores ? 'clickable-match' : '';
            
            html += `
                <div class="match ${clickableClass}" ${dataAttr}>
                    <div class="match-header">
                        <span class="match-code">${match.gameCode}</span>
                        <span class="match-venue">${match.venue || ''}</span>
                    </div>
                    <div class="match-teams">
                        <div class="team team1">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1 || ''}</div>
                        </div>
                        <div class="vs">vs</div>
                        <div class="team team2">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2 || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    html += `</div>`;
    
    // 添加特定於比賽顯示的CSS樣式
    if (!document.getElementById('match-style')) {
        const style = document.createElement('style');
        style.id = 'match-style';
        style.textContent = `
            .match {
                background-color: #f5f5f5;
                border-radius: 8px;
                margin-bottom: 10px;
                padding: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .clickable-match {
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .clickable-match:hover {
                background-color: #e9e9e9;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .match-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 14px;
                color: #666;
            }
            
            .match-code {
                font-weight: bold;
                color: #333;
            }
            
            .match-venue {
                font-style: italic;
            }
            
            .match-teams {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                padding: 0 5px;
            }
            
            .team {
                display: flex;
                flex-direction: column;
                width: 42%;
            }
            
            .team1 {
                align-items: flex-start;
                text-align: left;
            }
            
            .team2 {
                align-items: flex-end;
                text-align: right;
            }
            
            .team-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 2px;
            }
            
            .score {
                font-size: 22px;
                font-weight: bold;
                color: #c00;
                line-height: 1;
            }
            
            .vs {
                align-self: center;
                font-weight: bold;
                color: #666;
                padding: 0 5px;
                flex-shrink: 0;
                font-size: 14px;
                margin-top: 8px;
            }
            
            .match-date {
                margin-top: 15px;
                margin-bottom: 8px;
                position: relative;
            }
            
            .date {
                font-weight: bold;
                color: #333;
                background-color: #f0f0f0;
                padding: 3px 10px;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 使用不同的方法绑定事件，确保HTML插入DOM后能正确绑定
    const bindEvents = function() {
        const container = document.getElementById(uniqueId);
        if (!container) {
            console.log('找不到比賽容器:', uniqueId);
            return;
        }
        
        // 為所有可點擊的比賽添加事件
        const clickableMatches = container.querySelectorAll('.clickable-match');
        console.log('找到可點擊比賽數:', clickableMatches.length);
        
        clickableMatches.forEach(match => {
            // 移除舊事件監聽器（如果有）
            const newMatch = match.cloneNode(true);
            match.parentNode.replaceChild(newMatch, match);
            
            newMatch.addEventListener('click', function(e) {
                const gameUrl = this.getAttribute('data-game-url');
                console.log('點擊比賽, URL:', gameUrl);
                if (gameUrl) {
                    e.preventDefault();
                    e.stopPropagation();
                    showMatchDetails(gameUrl);
                }
            });
        });
    };
    
    // 使用MutationObserver确保DOM更新后绑定事件
    window.setTimeout(function() {
        bindEvents();
        
        // 安排多次重试绑定，确保在各种情况下都能成功
        setTimeout(bindEvents, 500);
        setTimeout(bindEvents, 1000);
    }, 0);
    
    return html;
}

function parseScheduleData(values, season = 'SEASON4') {
    debugLog('開始解析 schedule 工作表數據，季度:', season);
    debugLog('數據行數:', values.length);
    const result = [];
    
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length < 6) continue;
        
        // 統一的欄位解析：A=遊戲編號, B=日期, C=客場隊伍, D=客場分數, E=vs, F=主場分數, G=主場隊伍, H=比賽地點
        const gameCode = row[0];
        if (gameCode && typeof gameCode === 'string' && gameCode.startsWith('G') && row[1]) {
            debugLog(`處理比賽 (${season}): ${gameCode} - ${row[1]}`);
            debugLog(`${season} 解析 - C欄(客隊):`, row[2], 'D欄(客隊分數):', row[3], 'F欄(主隊分數):', row[5], 'G欄(主隊):', row[6]);
            result.push({
                gameCode: gameCode,
                date: row[1] || '',
                team1: row[2] || '',  // C欄：客場隊伍
                score1: row[3] || '',  // D欄：客場分數
                vs: row[4] || 'vs',    // E欄：vs
                score2: row[5] || '',  // F欄：主場分數
                team2: row[6] || '',   // G欄：主場隊伍
                venue: row[7] || ''    // H欄：比賽地點
            });
        }
    }
    debugLog(`共解析出 ${result.length} 場比賽`);
    return result;
}

function displayMatches(matches) {
    debugLog('開始處理並顯示比賽數據，總數據條數:', matches.length);
    const today = new Date();
    debugLog('當前日期:', today.toISOString().split('T')[0]);
    const lastWeekMatches = [];
    const upcomingMatches = [];
    
    // 先找出所有過去的比賽，按日期排序
    const pastMatches = [];
    for (const match of matches) {
        if (!match.date) {
            debugLog('跳過沒有日期的比賽:', match);
            continue;
        }
        const matchDate = parseDate(match.date);
        if (!matchDate) {
            debugLog('無法解析日期:', match.date, '跳過此比賽:', match);
            continue;
        }
        debugLog('比賽日期:', match.date, '解析為:', matchDate.toISOString().split('T')[0]);
        const diffTime = matchDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        debugLog('比賽與今天相差天數:', diffDays);
        
        if (diffDays < 0) {
            // 過去的比賽
            pastMatches.push({ ...match, diffDays, matchDate });
        } else if (diffDays >= 0 && diffDays <= 14) {
            // 未來 14 天的比賽
            debugLog('分類為近期比賽:', match);
            upcomingMatches.push(match);
        } else {
            debugLog('不在顯示範圍內的比賽:', match);
        }
    }
    
    // 將過去的比賽按日期降序排列（最近的在前）
    pastMatches.sort((a, b) => b.matchDate - a.matchDate);
    
    // 只顯示最近一場比賽日的所有比賽
    if (pastMatches.length > 0) {
        const mostRecentDate = pastMatches[0].matchDate;
        const mostRecentDateStr = mostRecentDate.toISOString().split('T')[0];
        
        for (const match of pastMatches) {
            const matchDateStr = match.matchDate.toISOString().split('T')[0];
            if (matchDateStr === mostRecentDateStr) {
                debugLog('分類為上週比賽:', match);
                lastWeekMatches.push(match);
            }
        }
    }
    
    // 按日期排序，確保最近的日期排在前面
    lastWeekMatches.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA; // 降序排列，最近的日期在前
    });
    
    // 按日期排序，確保最近的日期排在前面
    upcomingMatches.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB; // 升序排列，最近的日期在前
    });
    
    debugLog('上週比賽總數:', lastWeekMatches.length);
    debugLog('近期比賽總數:', upcomingMatches.length);
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    if (lastWeekContent) {
        if (lastWeekMatches.length > 0) {
            lastWeekContent.innerHTML = generateMatchesHTML(lastWeekMatches);
            debugLog('上週戰況已更新');
            
            // 更新上週戰況的日期顯示
            const lastWeekDate = lastWeekMatches.length > 0 ? lastWeekMatches[0].date : '上週';
            const lastWeekDateElement = document.getElementById('lastWeekDate');
            if (lastWeekDateElement) {
                lastWeekDateElement.textContent = lastWeekDate || '上週';
            }
        } else {
            lastWeekContent.innerHTML = '<p>無上週比賽數據</p>';
            debugLog('無上週比賽數據');
        }
    } else {
        console.error('找不到上週戰況容器元素');
    }
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    if (upcomingContent) {
        if (upcomingMatches.length > 0) {
            // 限制最多顯示5場近期比賽
            const limitedUpcomingMatches = upcomingMatches.slice(0, 5);
            upcomingContent.innerHTML = generateMatchesHTML(limitedUpcomingMatches);
            debugLog('近期比賽已更新，顯示', limitedUpcomingMatches.length, '場比賽');
            
            // 更新近期比賽的日期顯示
            const upcomingDate = upcomingMatches.length > 0 ? upcomingMatches[0].date : '本週';
            const upcomingDateElement = document.getElementById('upcomingDate');
            if (upcomingDateElement) {
                upcomingDateElement.textContent = upcomingDate || '本週';
            }
        } else {
            upcomingContent.innerHTML = '<p>無近期比賽數據</p>';
            debugLog('無近期比賽數據');
        }
    } else {
        console.error('找不到近期比賽容器元素');
    }
}

async function loadMatches() {
    try {
        debugLog('開始從 Google Sheets 載入比賽數據...');
        const sheetId = CONFIG.SEASON6.SHEET_ID;
        const apiKey = CONFIG.SEASON6.API_KEY;
        debugLog('使用的 Google Sheets ID:', sheetId);
        // debugLog('使用的 API Key:', apiKey); // 已註釋：隱藏敏感資訊
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/schedule!A:H?key=${apiKey}`;
        // debugLog('請求的 URL:', url); // 已註釋：隱藏敏感資訊
        const response = await fetch(url);
        debugLog('fetch 響應狀態:', response.status);
        if (!response.ok) {
            throw new Error(`Google Sheets API 錯誤: ${response.status}`);
        }
        const jsonData = await response.json();
        debugLog('獲取到的 JSON 數據:', jsonData);
        if (!jsonData.values || jsonData.values.length === 0) {
            throw new Error('Google Sheets 數據為空');
        }
        const data = parseScheduleData(jsonData.values.slice(1), 'SEASON6'); // 跳過標題行
        debugLog('解析後的比賽數據:', data);
        if (data.length === 0) {
            throw new Error('沒有有效的比賽數據');
        }
        displayMatches(data);
    } catch (error) {
        console.error('載入比賽時發生錯誤:', error);
        const lastWeekContent = document.getElementById('lastWeekMatchesContent');
        const upcomingContent = document.getElementById('upcomingMatchesContent');
        if (lastWeekContent) {
            lastWeekContent.innerHTML = `<p>載入數據時發生錯誤: ${error.message}</p>`;
        }
        if (upcomingContent) {
            upcomingContent.innerHTML = `<p>載入數據時發生錯誤: ${error.message}</p>`;
        }
    }
}

// 修改 loadNewsData，載入頁面時自動抓取 Google Sheets
async function loadNewsData() {
    try {
        await loadMatches();
    } catch (error) {
        showNewsError(error.message);
    }
}

// 載入rule頁面數據
async function loadRuleData() {
    console.log('Rule頁面: 開始載入數據');
    // 這裡可以添加其他rule頁面需要的數據載入邏輯
}

// 更新新聞內容
function updateNewsContent(lastMatch, nextMatch) {
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    
    if (lastWeekContent) {
        if (lastMatch) {
            lastWeekContent.innerHTML = createMatchesHTML(lastMatch, true);
        } else {
            lastWeekContent.innerHTML = '<p>沒有上週的比賽記錄</p>';
        }
    }
    
    if (upcomingContent) {
        if (nextMatch) {
            upcomingContent.innerHTML = createMatchesHTML(nextMatch);
        } else {
            upcomingContent.innerHTML = '<p>目前沒有安排的比賽</p>';
        }
    }
}

// 【修改 main.js (大檔案) 裡的這個函式】
async function loadRankData(page) {
        try {
            // 這裡的 'page' 變數來自 loadContent (例如 'rankS5')
            const currentSeason = page === 'rankS5' ? 'SEASON5' : (page === 'rankS4' ? 'SEASON4' : 'SEASON3');
            const config = CONFIG[currentSeason];
            if (!config) throw new Error('找不到配置');
    
            // === 【這就是我們新增的 S5 判斷邏輯】 ===
            // 根據 'page' 變數來判斷
            const isS5 = (currentSeason === 'SEASON5'); 
            const rankRange = isS5 ? 'schedule!O:V' : 'schedule!K:Q';
            const rankUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/${rankRange}?key=${config.API_KEY}`;
            
            console.log('判斷為 S5:', isS5);
            // console.log('正在請求團隊排名 URL:', rankUrl); // 已註釋：隱藏敏感資訊
            // ==========================================
    
            // 載入團隊排名 (【修改這裡】使用我們剛建立的 rankUrl 變數)
            const rankResponse = await fetch(rankUrl); 
            if (!rankResponse.ok) throw new Error(`HTTP 錯誤! 狀態: ${rankResponse.status}`);
            
            const rankData = await rankResponse.json();
            if (!rankData.values || rankData.values.length === 0) {
                throw new Error('No data found in sheet');
            }
    
            // 【修改這裡】把 isS5 傳遞下去，讓 updateTeamRankings 知道如何解析
            updateTeamRankings(rankData.values.slice(1), isS5);
    
            // 載入個人排名
            const personalResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/personal!A:I?key=${config.API_KEY}`);
            if (!personalResponse.ok) throw new Error(`HTTP 錯誤! 狀態: ${personalResponse.status}`);
            
            const personalData = await personalResponse.json();
            if (!personalData.values || personalData.values.length === 0) {
                throw new Error('No personal data found in sheet');
            }
    
            // 更新個人排名表格並設置功能 (這部分邏輯不變)
            const personalRankings = personalData.values.slice(1).map(row => ({
                team: row[0] || '',
                name: row[1] || '',
                wins01: parseFloat(row[2]) || 0,
                rate01: parseFloat(row[3]) || 0,
                winsCR: parseFloat(row[4]) || 0,
                rateCR: parseFloat(row[5]) || 0,
                totalWins: parseFloat(row[6]) || 0,
                totalRate: parseFloat(row[7]) || 0,
                firstRate: parseFloat(row[8]) || 0
            }));
    
            // 初始化個人排名相關功能
            initializePersonalRankings(personalRankings);
    
        } catch (error) {
            console.error('載入排名數據時發生錯誤:', error);
            showRankError(error.message);
        }
    }

// 初始化個人排名功能
function initializePersonalRankings(rankings) {
    let currentData = [...rankings];
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentSort = {
        column: 'totalWins',
        ascending: false
    };

    // 更新個人排名表格
    function updatePersonalTable() {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageData = currentData.slice(start, end);
        const totalPages = Math.ceil(currentData.length / rowsPerPage);
        
        // 更新表格內容
        const tableBody = document.getElementById('personalTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = pageData.map((row, index) => `
            <tr>
                <td>${start + index + 1}</td>
                <td>${row.team}</td>
                <td>${row.name}</td>
                <td>${row.wins01}</td>
                <td>${row.rate01}%</td>
                <td>${row.winsCR}</td>
                <td>${row.rateCR}%</td>
                <td>${row.totalWins}</td>
                <td>${row.totalRate}%</td>
                <td>${row.firstRate}%</td>
            </tr>
        `).join('');

        // 更新分頁信息
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.innerHTML = `第 ${currentPage} 頁，共 ${totalPages} 頁`;
        }

        // 更新分頁按鈕狀態
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        if (prevButton) prevButton.disabled = currentPage === 1;
        if (nextButton) nextButton.disabled = currentPage === totalPages;
    }

    // 設置排序功能
    function setupSorting() {
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                if (currentSort.column === column) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.column = column;
                    currentSort.ascending = true;
                }

                // 移除所有排序指示器
                headers.forEach(h => h.classList.remove('asc', 'desc'));
                header.classList.add(currentSort.ascending ? 'asc' : 'desc');

                // 排序數據
                currentData.sort((a, b) => {
                    let aValue = a[column];
                    let bValue = b[column];
                    
                    if (typeof aValue === 'string' && aValue.includes('%')) {
                        aValue = parseFloat(aValue);
                        bValue = parseFloat(bValue);
                    }
                    
                    if (currentSort.ascending) {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });

                currentPage = 1;
                updatePersonalTable();
            });
        });
    }

    // 設置篩選功能
    function setupFilters() {
        const teamFilter = document.getElementById('teamFilter');
        const nameSearch = document.getElementById('nameSearch');
        const resetButton = document.getElementById('resetFilter');

        if (!teamFilter || !nameSearch || !resetButton) return;

        // 獲取唯一的隊伍列表
        const uniqueTeams = [...new Set(rankings.map(row => row.team))]
            .filter(team => team)
            .sort();

        // 添加隊伍選項
        teamFilter.innerHTML = '<option value="">所有隊伍</option>' +
            uniqueTeams.map(team => `<option value="${team}">${team}</option>`).join('');

        function filterData() {
            const teamValue = teamFilter.value;
            const nameValue = nameSearch.value.toLowerCase();

            currentData = rankings.filter(row => {
                const teamMatch = !teamValue || row.team === teamValue;
                const nameMatch = !nameValue || row.name.toLowerCase().includes(nameValue);
                return teamMatch && nameMatch;
            });

            currentPage = 1;
            updatePersonalTable();
        }

        // 添加事件監聽器
        teamFilter.addEventListener('change', filterData);
        nameSearch.addEventListener('input', filterData);
        resetButton.addEventListener('click', () => {
            teamFilter.value = '';
            nameSearch.value = '';
            currentData = [...rankings];
            currentPage = 1;
            updatePersonalTable();
        });
    }

    // 設置分頁功能
    function setupPagination() {
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    updatePersonalTable();
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(currentData.length / rowsPerPage);
                if (currentPage < totalPages) {
                    currentPage++;
                    updatePersonalTable();
                }
            });
        }
    }

    // 初始化所有功能
    setupSorting();
    setupFilters();
    setupPagination();
    updatePersonalTable();
}

// 【修改 main.js (大檔案) 裡的這個函式】

function updateTeamRankings(data, isS5 = false) {
    const tableBody = document.getElementById('rankTableBody');
    if (!tableBody) return;

    const rankings = data.map(row => {
        // S5 判斷
        if (isS5) {
            // S5: O:V (O排名, P隊名, Q勝, R敗, S和, T積分, U飲酒, V總分)
            const team = row[1] || ''; // P 隊名
            const total = parseFloat(row[7] || 0); // V 總分
            return {
                team,
                wins: row[2] || '',   // Q 勝
                losses: row[3] || '', // R 敗
                draws: row[4] || '',  // S 和
                points: row[5] || '', // T 積分
                bonus: row[6] || '',  // U 飲酒
                total: isNaN(total) ? 0 : total
            };
        }

        // S3/S4: K:Q (K隊名, L勝, M敗, N和, O積分, P飲酒, Q總分)
        return {
            team: row[0] || '',
            wins: row[1] || '',
            losses: row[2] || '',
            draws: row[3] || '',
            points: row[4] || '',
            bonus: row[5] || '',
            total: parseFloat(row[6] || 0)
        };
    })
    // 過濾空行
    .filter(item => item.team && !isNaN(item.total))
    // 排序
    .sort((a, b) => b.total - a.total);

    // === 【這就是你要修正的地方】 ===
    // 確保所有 <td> 都在 同一個 <tr> 裡面
    tableBody.innerHTML = rankings.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${row.team}</td>
            <td>${row.wins}</td>
            <td>${row.losses}</td>
            <td>${row.draws}</td>
            <td>${row.points}</td>
            <td>${row.bonus}</td>
            <td>${row.total}</td>
        </tr>
    `).join('');
    // =================================
}

// 載入賽程數據
async function loadScheduleData(page) {
    console.log('=== 開始載入賽程數據 ===', page);
    console.log('當前頁面:', window.location.href);
    console.log('seasonOverride:', typeof seasonOverride !== 'undefined' ? seasonOverride : '未定義');
    debugLog('開始載入賽程數據:', page);
    debugLog('當前頁面:', window.location.href);
    let config = null;
    
    // 檢查是否有明確指定的賽季覆蓋設定
    if (typeof seasonOverride !== 'undefined' && seasonOverride) {
        debugLog('使用明確指定的賽季:', seasonOverride);
        if (seasonOverride === 's6' || seasonOverride === 'SEASON6') {
            config = CONFIG.SEASON6;
        } else if (seasonOverride === 's5' || seasonOverride === 'SEASON5') {
            config = CONFIG.SEASON5;
        } else if (seasonOverride === 's4' || seasonOverride === 'SEASON4') {
            config = CONFIG.SEASON4;
        } else if (seasonOverride === 's3' || seasonOverride === 'SEASON3') {
            config = CONFIG.SEASON3;
        }
    } else if (typeof window.seasonOverride !== 'undefined' && window.seasonOverride) {
        debugLog('使用 window.seasonOverride:', window.seasonOverride);
        if (window.seasonOverride === 's6' || window.seasonOverride === 'SEASON6') {
            config = CONFIG.SEASON6;
        } else if (window.seasonOverride === 's5' || window.seasonOverride === 'SEASON5') {
            config = CONFIG.SEASON5;
        } else if (window.seasonOverride === 's4' || window.seasonOverride === 'SEASON4') {
            config = CONFIG.SEASON4;
        } else if (window.seasonOverride === 's3' || window.seasonOverride === 'SEASON3') {
            config = CONFIG.SEASON3;
        }
    } else {
        // 根據頁面確定要使用的配置
        if (page === 'scheduleS6') {
            debugLog('根據頁面名稱判斷為第六屆');
            config = CONFIG.SEASON6;
        } else if (page === 'scheduleS5') {
            debugLog('根據頁面名稱判斷為第五屆');
            config = CONFIG.SEASON5;
        } else if (page === 'scheduleS4') {
            debugLog('根據頁面名稱判斷為第四屆');
            config = CONFIG.SEASON4;
        } else if (page === 'schedule') {  // schedule.html 對應第三屆
            debugLog('根據頁面名稱判斷為第三屆');
            config = CONFIG.SEASON3;
        } else {
            // 最後嘗試根據 URL 路徑判斷
            const currentPath = window.location.pathname;
            if (currentPath.includes('scheduleS6') || currentPath.includes('schedule6')) {
                debugLog('根據 URL 路徑判斷為第六屆');
                config = CONFIG.SEASON6;
            } else if (currentPath.includes('scheduleS5') || currentPath.includes('schedule5')) {
                debugLog('根據 URL 路徑判斷為第五屆');
                config = CONFIG.SEASON5;
            } else if (currentPath.includes('scheduleS4') || currentPath.includes('schedule4')) {
                debugLog('根據 URL 路徑判斷為第四屆');
                config = CONFIG.SEASON4;
            } else if (currentPath.includes('schedule')) {
                debugLog('根據 URL 路徑判斷為第三屆');
                config = CONFIG.SEASON3;
            } else {
                debugLog('未知的賽程頁面:', page, '當前路徑:', currentPath);
                return;
            }
        }
    }

    if (!config) {
        debugLog('無法確定配置');
        return;
    }

    // 構建 Google Sheets API URL - 讀取 schedule 工作表的 A:H 欄
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.SHEET_ID}/values/schedule!A:H?key=${config.API_KEY}`;
    debugLog('嘗試載入 Google Sheets 數據:', sheetUrl);

    try {
        showLoadingBar();
        debugLog('開始發送請求到 Google Sheets API');
        const response = await fetch(sheetUrl);
        debugLog('收到響應:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
        }
        
        const data = await response.json();
        debugLog('Google Sheets API 響應成功');
        
        if (!data.values || !Array.isArray(data.values)) {
            throw new Error('無效的 Google Sheets 數據格式');
        }
        
        // 解析 Google Sheets 數據
        const rows = data.values;
        debugLog('收到的數據行數:', rows.length);
        
        // 使用統一的解析函數，並傳入正確的季度參數
        let currentSeason = 'SEASON3';
        if (config === CONFIG.SEASON6) {
            currentSeason = 'SEASON6';
        } else if (config === CONFIG.SEASON5) {
            currentSeason = 'SEASON5';
        } else if (config === CONFIG.SEASON4) {
            currentSeason = 'SEASON4';
        } else if (config === CONFIG.SEASON3) {
            currentSeason = 'SEASON3';
        }
        console.log('=== 使用的配置 ===');
        console.log('currentSeason:', currentSeason);
        console.log('config.SHEET_ID:', config.SHEET_ID);
        console.log('原始資料前3行:', rows.slice(0, 3));
        const parseResults = parseScheduleData(rows.slice(1), currentSeason); // 跳過標題行
        console.log('解析結果前3個:', parseResults.slice(0, 3));
        
        // 轉換解析結果為適合表格顯示的格式
        const scheduleData = parseResults.map(match => {
            // 轉換日期格式 - 確保年份正確
            let fullDate = match.date;
            if (currentSeason === 'SEASON6' && !match.date.includes('2026')) {
                fullDate = `2026/${match.date}`;
            } else if (currentSeason === 'SEASON5' && !match.date.includes('2025')) {
                fullDate = `2025/${match.date}`;
            } else if (currentSeason === 'SEASON4' && !match.date.includes('2025')) {
                fullDate = `2025/${match.date}`;
            } else if (currentSeason === 'SEASON3') {
                // SEASON3 的日期維持原樣，不加年份
                fullDate = match.date;
            }
            
            debugLog('原始 match 資料:', match);
            const result = {
                gameNumber: match.gameCode,
                date: fullDate,           // A欄：日期
                awayTeam: match.team1,    // B欄：客隊
                awayScore: match.score1 || '',  // C欄：客隊分數
                homeTeam: match.team2,    // F欄：主隊
                homeScore: match.score2 || ''   // E欄：主隊分數
            };
            debugLog('轉換後的 result:', result);
            return result;
        });
        
                 debugLog('解析的比賽數據:', scheduleData.length, '場比賽');
        
        // 獲取當前日期
        const currentDate = new Date();
        
        // 生成表格內容
        let tableContent = '';
        
        scheduleData.forEach((match) => {
            const matchDate = new Date(match.date);
            const hasScores = match.awayScore && match.homeScore && match.awayScore !== '' && match.homeScore !== '';
            const isPastMatch = matchDate < currentDate;
            
            // 提取遊戲編號數字部分 (G01 -> 01)，確保是兩位數格式
            const gameNumber = match.gameNumber.substring(1).padStart(2, '0');
            let gameResultPath = '';
            
            // 根據配置設定正確的路徑
            if (config === CONFIG.SEASON6) {
                gameResultPath = `game_result/season6/g${gameNumber}.html`;
            } else if (config === CONFIG.SEASON5) {
                gameResultPath = `game_result/season5/g${gameNumber}.html`;
            } else if (config === CONFIG.SEASON4) {
                gameResultPath = `game_result/season4/g${gameNumber}.html`;
            } else if (config === CONFIG.SEASON3) {
                gameResultPath = `game_result/season3/g${gameNumber}.html`;
            }

            // 生成日期單元格的HTML，添加點擊事件
            // 格式化顯示日期 (去掉年份，只顯示 M/D)
            let displayDate = match.date;
            if (match.date && match.date.includes('/')) {
                const dateParts = match.date.split('/');
                if (dateParts.length >= 3) {
                    // 從 2026/06/02 轉換成 6/2
                    displayDate = `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;
                } else if (dateParts.length === 2) {
                    // 如果已經是 M/D 格式，去掉前導零
                    displayDate = `${parseInt(dateParts[0])}/${parseInt(dateParts[1])}`;
                }
            }
            
            let dateHtml = '';
            if (isPastMatch && hasScores) {
                // 為過去的比賽添加可點擊的日期，顯示比賽結果
                dateHtml = `<span class="clickable-date" data-game-url="${gameResultPath}">${displayDate}</span>`;
            } else {
                dateHtml = displayDate;
            }

            // 準備比分單元格的內容 - C欄(客隊分數) - E欄(主隊分數)
            let scoreContent = hasScores 
                ? `${match.awayScore} - ${match.homeScore}` 
                : 'vs';

            // 調試用：強制檢查資料
            console.log('表格行資料:', {
                gameNumber,
                date: match.date,
                awayTeam: match.awayTeam,
                awayScore: match.awayScore,
                homeTeam: match.homeTeam,
                homeScore: match.homeScore,
                scoreContent
            });

            // 生成表格行
            tableContent += `
                <tr id="match-${gameNumber}" class="${isPastMatch && hasScores ? 'clickable-match' : ''}">
                    <td class="date-cell">${dateHtml}</td>
                    <td class="team-cell">${match.awayTeam}</td>
                    <td class="score-cell">${scoreContent}</td>
                    <td class="team-cell">${match.homeTeam}</td>
                </tr>
            `;
        });
            
            // 更新表格內容
            const tableBody = document.querySelector('.schedule-table tbody');
            if (tableBody) {
                tableBody.innerHTML = tableContent;
                debugLog('表格內容已更新');
                
                // 添加日期單元格的點擊事件
                document.querySelectorAll('.clickable-date').forEach(dateElement => {
                    dateElement.addEventListener('click', function(e) {
                        e.stopPropagation(); // 防止事件冒泡到tr
                        const gameUrl = this.getAttribute('data-game-url');
                        debugLog('點擊日期，顯示比賽詳情:', gameUrl);
                        if (gameUrl) {
                            showMatchDetails(gameUrl);
                        }
                    });
                });
                
                // 設置表格行點擊事件
                setupMatchTableRows();
                
                // 重要: 重新初始化篩選功能
                debugLog('關鍵: 表格加載完成，延遲調用篩選功能初始化');
                
                // 確保清除所有按鈕的選中狀態
                document.querySelectorAll('.team-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // 一個簡單的延遲，確保DOM完全更新
                setTimeout(() => {
                    // 檢查並調用filter.js中的初始化函數
                    debugLog('嘗試初始化篩選功能');
                    try {
                        // 首先檢查全局命名空間
                        if (typeof window.initializeFilters === 'function') {
                            debugLog('找到window.initializeFilters函數，調用初始化');
                            window.initializeFilters();
                        } else if (typeof initializeFilters === 'function') {
                            debugLog('找到局部initializeFilters函數，調用初始化');
                            initializeFilters();
                        } else if (typeof window.setupScheduleFilters === 'function') {
                            debugLog('找到window.setupScheduleFilters函數，調用初始化');
                            window.setupScheduleFilters();
                        } else if (typeof setupScheduleFilters === 'function') {
                            debugLog('找到局部setupScheduleFilters函數，調用初始化');
                            setupScheduleFilters();
                        } else {
                            // 如果都找不到，使用備用函數
                            debugLog('使用內部備用篩選函數_setupScheduleFilters');
                            _setupScheduleFilters();
                        }
                    } catch (error) {
                        debugLog('初始化篩選功能時發生錯誤:', error);
                        // 嘗試使用備用函數
                        try {
                            _setupScheduleFilters();
                        } catch (backupError) {
                            debugLog('備用篩選功能也失敗:', backupError);
                        }
                    }
                }, 800); // 增加延遲時間，確保DOM和所有腳本都已加載
            } else {
                debugLog('找不到表格元素 .schedule-table tbody');
            }
            
            hideLoadingBar();
            debugLog('賽程數據載入完成');
            
    } catch (error) {
        debugLog('載入賽程數據時發生錯誤:', error);
        const tableBody = document.querySelector('.schedule-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4">載入數據時發生錯誤</td></tr>';
        }
        hideLoadingBar();
    }
}

// 顯示比賽詳情
function showMatchDetails(gameUrl) {
    console.log('✅ showMatchDetails (已修復版本) - 顯示比賽詳情:', gameUrl);
    
    // 如果已經存在模態框，先移除（但不要移除季後賽模態窗口）
    const existingModal = document.querySelector('.match-modal:not(#playoffsModal)');
    console.log('找到的現有模態窗口:', existingModal);
    if (existingModal && existingModal.parentNode) {
        console.log('移除模態窗口:', existingModal);
        existingModal.parentNode.removeChild(existingModal);
    }
    
    // 創建模態框容器
    const modal = document.createElement('div');
    modal.className = 'match-modal';
    
    // 創建模態框內容
    const modalContent = document.createElement('div');
    modalContent.className = 'match-modal-content';
    
    // 添加關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeMatchModal(modal);
    });
    
    // 創建iframe來加載比賽結果頁面
    const iframe = document.createElement('iframe');
    iframe.className = 'match-iframe';
    iframe.src = gameUrl;
    
    // 確保 iframe 加載正常
    iframe.onerror = function() {
        console.error('iframe 加載失敗:', gameUrl);
        iframe.srcdoc = `<div style="padding: 20px; text-align: center;">
            <h2>加載失敗</h2>
            <p>無法加載比賽詳情: ${gameUrl}</p>
            <p><a href="${gameUrl}" target="_blank">嘗試在新標籤頁打開</a></p>
        </div>`;
    };
    
    // 組裝模態框
    modalContent.appendChild(closeButton);
    modalContent.appendChild(iframe);
    modal.appendChild(modalContent);
    
    // 添加到頁面
    document.body.appendChild(modal);
    
    // 確保模態框顯示
    setTimeout(function() {
        modal.classList.add('visible');
        console.log('模態框已添加可見類');
    }, 10);
    
    // 添加點擊模態框背景關閉的功能
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMatchModal(modal);
        }
    });
    
    // 添加ESC鍵關閉功能
    const handleKeyDown = function(e) {
        if (e.key === 'Escape') {
            if (document.body.contains(modal)) {
                closeMatchModal(modal);
            }
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
}

// 關閉模態框
function closeMatchModal(modal) {
    modal.classList.remove('visible');
    
    // 等待動畫完成後再移除元素
    setTimeout(() => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    }, 300);
}

// 以下是原main.js中的筛选函数，為避免與filter.js衝突，將它们重命名
// 注意：這些函數通常不會被使用，而是由filter.js中的函數替代
function _setupScheduleFilters() {
    debugLog('使用main.js中的備用篩選功能(_setupScheduleFilters)');
    const teamButtons = document.querySelectorAll('.team-btn');
    if (teamButtons.length === 0) {
        debugLog('警告: 未找到任何篩選按鈕，請確認頁面加載正確');
        return;
    }
    
    const selectedTeams = new Set();
    
    teamButtons.forEach(button => {
        const team = button.getAttribute('data-team');
        
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            const team = this.getAttribute('data-team');
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                selectedTeams.delete(team);
            } else {
                this.classList.add('selected');
                selectedTeams.add(team);
            }
            
            _filterScheduleTable(Array.from(selectedTeams));
        });
    });
}

function _filterScheduleTable(selectedTeams) {
    debugLog('使用main.js中的備用篩選表格功能(_filterScheduleTable)');
    const tbody = document.querySelector('.schedule-table tbody');
    if (!tbody) {
        debugLog('未找到表格主體');
        return;
    }
    
    const rows = tbody.querySelectorAll('tr');
    
    if (selectedTeams.length === 0) {
        rows.forEach(row => {
            row.style.display = '';
            row.querySelectorAll('td').forEach(cell => {
                cell.classList.remove('highlight-team');
            });
        });
        return;
    }
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) {
            return;
        }
        
        const awayTeam = cells[1].textContent.trim();
        const homeTeam = cells[3].textContent.trim();
        
        const matchFound = selectedTeams.some(team => 
            awayTeam.includes(team) || homeTeam.includes(team)
        );
        
        row.style.display = matchFound ? '' : 'none';
        
        if (matchFound) {
            if (selectedTeams.some(team => awayTeam.includes(team))) {
                cells[1].classList.add('highlight-team');
            } else {
                cells[1].classList.remove('highlight-team');
            }
            
            if (selectedTeams.some(team => homeTeam.includes(team))) {
                cells[3].classList.add('highlight-team');
            } else {
                cells[3].classList.remove('highlight-team');
            }
        }
    });
}

// 如果filter.js未加载，提供备用初始化函数
function _initializeFilters() {
    debugLog('使用main.js中的備用初始化函數(_initializeFilters)');
    _setupScheduleFilters();
}

function showLoadingBar() {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.display = 'block';
        const loadingProgress = loadingBar.querySelector('.loading-progress');
        if (loadingProgress) {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                loadingProgress.style.width = `${Math.min(progress, 90)}%`;
                if (progress >= 90) clearInterval(progressInterval);
            }, 100);
        }
    }
}

function hideLoadingBar() {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        const loadingProgress = loadingBar.querySelector('.loading-progress');
        if (loadingProgress) {
            loadingProgress.style.width = '100%';
        }
        setTimeout(() => {
            loadingBar.style.display = 'none';
        }, 500);
    }
}

// 錯誤處理函數
function showNewsError(message) {
    const lastWeekContent = document.getElementById('lastWeekMatchesContent');
    const upcomingContent = document.getElementById('upcomingMatchesContent');
    
    if (lastWeekContent) {
        lastWeekContent.innerHTML = `<p>載入上週戰況時發生錯誤: ${message}</p>`;
    }
    if (upcomingContent) {
        upcomingContent.innerHTML = `<p>載入近期比賽時發生錯誤: ${message}</p>`;
    }
}

function showRankError(message) {
    const rankTableBody = document.getElementById('rankTableBody');
    const personalTableBody = document.getElementById('personalTableBody');
    
    if (rankTableBody) {
        rankTableBody.innerHTML = `<tr><td colspan="8">載入排名時發生錯誤: ${message}</td></tr>`;
    }
    if (personalTableBody) {
        personalTableBody.innerHTML = `<tr><td colspan="10">載入個人排名時發生錯誤: ${message}</td></tr>`;
    }
}

function showScheduleError(message) {
    const leagueTable = document.getElementById('leagueTable');
    if (leagueTable) {
        leagueTable.innerHTML = `<tr><td colspan="4">載入賽程時發生錯誤: ${message}</td></tr>`;
    }
}

// 預加載資源
async function preloadResources(page = 'news') {
    debugLog('開始預加載資源，當前頁面:', page);
    
    // 基礎 CSS 文件（立即加載）
    const baseCssFiles = [
        'styles/index.css'
    ];

    // 頁面特定的 CSS 文件（按需加載）
    const pageCssMap = {
        'news': ['styles/news.css'],
        'rank': ['styles/rank.css'],
        'rankS4': ['styles/rank.css'],
        'rankS5': ['styles/rank.css'],
        'schedule': ['styles/schedule.css'],
        'scheduleS4': ['styles/schedule.css'],
        'scheduleS5': ['styles/schedule.css'],
        'scheduleS6': ['styles/schedule.css'],
        'shops': ['styles/shops.css']
    };

    // 共用圖片（立即加載）- 使用 WebP 格式
    const commonImages = [
        'images/banner.png'
    ];

    // 頁面特定的圖片（按需加載）
    const pageImageMap = {
        'shops': [
            'images/fb-icon.png',
            'images/ig-icon.png',
            'images/phone-icon.png'
        ]
    };

    try {
        // 立即加載基礎 CSS
        const baseCssPromises = baseCssFiles.map(file => loadCSS(file, true, false));
        await Promise.all(baseCssPromises);
        debugLog('基礎 CSS 加載完成');

        // 立即加載共用圖片
        const commonImagePromises = commonImages.map(file => loadImage(file));
        Promise.all(commonImagePromises).then(() => {
            debugLog('共用圖片加載完成');
        });

        // 加載當前頁面需要的 CSS - 使用normal模式
        if (pageCssMap[page]) {
            const pageCssPromises = pageCssMap[page].map(file => loadCSS(file, true, false));
            Promise.all(pageCssPromises).then(() => {
                debugLog(`${page} 頁面 CSS 加載完成`);
            });
        }

        // 加載當前頁面需要的圖片
        if (pageImageMap[page]) {
            const pageImagePromises = pageImageMap[page].map(file => loadImage(file));
            Promise.all(pageImagePromises).then(() => {
                debugLog(`${page} 頁面圖片加載完成`);
            });
        }

        // 根據用戶交互來預加載其他頁面的資源
        if (window.cssPreloadingDone !== true) {
            setupPreloadOnHover();
            window.cssPreloadingDone = true;
        }
    } catch (error) {
        debugLog('資源加載過程中發生錯誤:', error);
    }
}

// 基於用戶交互的預加載策略
function setupPreloadOnHover() {
    const navItems = document.querySelectorAll('.sidebar-btn');
    const preloadedPages = new Set();
    
    navItems.forEach(item => {
        const page = item.dataset.page;
        if (!page || page === 'news' || preloadedPages.has(page)) return;
        
        item.addEventListener('mouseenter', () => {
            // 當用戶將鼠標懸停在導航項上時預加載對應頁面的CSS
            if (preloadedPages.has(page)) return;
            
            debugLog(`鼠標懸停預加載: ${page}`);
            const pageCssMap = {
                'rank': ['styles/rank.css'],
                'rankS4': ['styles/rank.css'],
                'rankS5': ['styles/rank.css'],
                'schedule': ['styles/schedule.css'],
                'scheduleS4': ['styles/schedule.css'],
                'scheduleS5': ['styles/schedule.css'],
        'scheduleS6': ['styles/schedule.css'],
                'shops': ['styles/shops.css']
            };
            
            if (pageCssMap[page]) {
                pageCssMap[page].forEach(file => {
                    loadCSS(file, false, false);
                });
                preloadedPages.add(page);
            }
        });
    });
}

// 加載 CSS 文件
function loadCSS(file, isImportant = false, isPreload = false) {
    return new Promise((resolve, reject) => {
        // 檢查是否已經加載過此CSS文件
        const existingLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'));
        const isAlreadyLoaded = existingLinks.some(link => link.href.includes(file));
        
        // 如果已經加載過，只有在非預加載模式時才應用該CSS
        if (isAlreadyLoaded) {
            // 檢查是否為預加載模式的CSS需要轉為常規應用模式
            if (!isPreload) {
                const preloadLink = existingLinks.find(link => 
                    link.href.includes(file) && 
                    link.rel === 'preload' && 
                    link.getAttribute('as') === 'style'
                );
                
                // 如果找到預加載的鏈接，將其轉換為stylesheet
                if (preloadLink) {
                    debugLog(`將預加載的CSS轉為應用: ${file}`);
                    // 創建新的stylesheet鏈接而不是修改原有的
                    // 這樣可以避免閃爍和樣式突變問題
                    const styleLink = document.createElement('link');
                    styleLink.rel = 'stylesheet';
                    styleLink.href = preloadLink.href;
                    if (isImportant) {
                        styleLink.setAttribute('importance', 'high');
                    }
                    
                    styleLink.onload = () => {
                        debugLog(`CSS已應用：${file}`);
                        resolve();
                    };
                    
                    styleLink.onerror = (err) => {
                        debugLog(`CSS應用失敗: ${file}`, err);
                        reject(err);
                    };
                    
                    document.head.appendChild(styleLink);
                    return;
                }
            }
            
            // 如果已經載入且不需要轉換，直接完成
            resolve();
            return;
        }
        
        // 創建新的link元素
        const link = document.createElement('link');
        
        // 設置通用屬性
        link.href = file;
        
        // 根據是否為預加載模式設置不同的屬性
        if (isPreload) {
            link.rel = 'preload';
            link.as = 'style';
            link.setAttribute('data-preload', 'true');
        } else {
            link.rel = 'stylesheet';
            if (isImportant) {
                link.setAttribute('importance', 'high');
            }
        }
        
        // 添加事件監聽器
        link.onload = () => {
            debugLog(`${isPreload ? 'CSS預加載' : 'CSS載入'}成功: ${file}`);
            resolve();
        };
        
        link.onerror = (err) => {
            debugLog(`${isPreload ? 'CSS預加載' : 'CSS載入'}失敗: ${file}`, err);
            reject(err);
        };
        
        // 添加到頁面
        document.head.appendChild(link);
    });
}

// 加載圖片
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            debugLog(`圖片加載成功: ${src}`);
            resolve(img);
        };
        img.onerror = (err) => {
            debugLog(`圖片加載失敗: ${src}`, err);
            reject(err);
        };
        img.src = src;
    });
}

// 驗證 JSON 格式
function validateScheduleData(jsonText) {
    try {
        const parsed = JSON.parse(jsonText);
        if (!parsed.schedule || !Array.isArray(parsed.schedule)) {
            throw new Error('缺少 schedule 陣列');
        }
        
        if (parsed.schedule.length === 0) {
            throw new Error('schedule 陣列為空');
        }
        
        parsed.schedule.forEach((day, index) => {
            if (!day.date) {
                throw new Error(`第 ${index+1} 個比賽日缺少日期`);
            }
            
            if (!day.games || !Array.isArray(day.games)) {
                throw new Error(`第 ${index+1} 個比賽日 (${day.date}) 缺少 games 陣列`);
            }
            
            day.games.forEach((game, gameIndex) => {
                if (!game.game_number) {
                    throw new Error(`${day.date} 的第 ${gameIndex+1} 場比賽缺少遊戲編號`);
                }
                if (!game.team1) {
                    throw new Error(`${day.date} 的第 ${gameIndex+1} 場比賽 (${game.game_number}) 缺少隊伍1`);
                }
                if (!game.team2) {
                    throw new Error(`${day.date} 的第 ${gameIndex+1} 場比賽 (${game.game_number}) 缺少隊伍2`);
                }
            });
        });
        
        return true;
    } catch (e) {
        debugLog('JSON 驗證錯誤:', e.message);
        throw e;
    }
}

// 設置表格行點擊事件
function setupMatchTableRows() {
    const clickableMatches = document.querySelectorAll('.clickable-match');
    debugLog('找到可點擊比賽行數:', clickableMatches.length);
    
    clickableMatches.forEach(row => {
        row.addEventListener('click', function() {
            debugLog('點擊比賽行:', this.id);
            const dateCell = this.querySelector('.date-cell');
            if (dateCell) {
                const clickableDate = dateCell.querySelector('.clickable-date');
                if (clickableDate) {
                    const gameUrl = clickableDate.getAttribute('data-game-url');
                    debugLog('找到比賽URL:', gameUrl);
                    if (gameUrl) {
                        showMatchDetails(gameUrl);
                    }
                }
            }
        });
    });
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    debugLog('頁面載入完成');
    
    // 設置漢堡選單處理
    setupHamburgerMenu();
    
    // 設置導航
    setupNavigation();
    
    // 處理URL中的錨點
    const hash = window.location.hash.substring(1);
    if (hash) {
        debugLog('處理URL中的錨點:', hash);
        const parts = hash.split('/');
        const page = parts[0];
        const anchor = parts.length > 1 ? parts[1] : null;
        
        if (page) {
            loadContent(page, anchor, false);
        }
    } else {
        debugLog('沒有錨點，載入默認頁面');
        loadContent('news', null, true);
    }
    
    // 監聽瀏覽器前進後退
    window.addEventListener('popstate', function(event) {
        debugLog('瀏覽器導航:', event.state);
        if (event.state && event.state.page) {
            loadContent(event.state.page, event.state.anchor, false);
        } else {
            loadContent('news', null, false);
        }
    });
});

// 新聞展開/收起功能
function toggleAllNews() {
    console.log('toggleAllNews 被調用');
    const expandableNews = document.getElementById('expandableNews');
    const expandBtn = document.getElementById('expandBtn');
    
    if (!expandableNews || !expandBtn) {
        console.log('找不到展開元素');
        return;
    }
    
    if (expandableNews.classList.contains('show-all')) {
        // 收起
        expandableNews.classList.remove('show-all');
        expandBtn.textContent = '顯示全部';
        console.log('新聞已收起');
    } else {
        // 展開
        expandableNews.classList.add('show-all');
        expandBtn.textContent = '收起';
        console.log('新聞已展開');
        
        // 如果展開的新聞中有折疊項目，初始化它們
        setTimeout(() => {
            initializeNewsToggle();
        }, 100);
    }
}

// Awards頁面初始化函數
async function initializeAwardsPage() {
    console.log('🖼️ 開始初始化Awards頁面...');
    
    // 等待DOM載入完成
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 檢查DOM元素是否存在
    console.log('🔍 檢查Awards頁面DOM元素...');
    const galleryS4 = document.getElementById('gallery-s4');
    const galleryS3 = document.getElementById('gallery-s3');
    const galleryS2 = document.getElementById('gallery-s2');
    
    console.log('Gallery elements found:', {
        's4': !!galleryS4,
        's3': !!galleryS3,
        's2': !!galleryS2
    });
    
    if (!galleryS4 || !galleryS3 || !galleryS2) {
        console.error('❌ Awards頁面DOM元素未找到');
        return;
    }
    
    // 載入各季度照片
    console.log('⏳ 開始載入各季度照片...');
    
    try {
        await loadPhotosForSeason('s4');
        console.log('✅ s4載入完成');
    } catch (error) {
        console.error('❌ s4載入失敗:', error);
    }
    
    try {
        await loadPhotosForSeason('s3');
        console.log('✅ s3載入完成');
    } catch (error) {
        console.error('❌ s3載入失敗:', error);
    }
    
    try {
        await loadPhotosForSeason('s2');
        console.log('✅ s2載入完成');
    } catch (error) {
        console.error('❌ s2載入失敗:', error);
    }
    
    console.log('🏁 Awards頁面初始化完成！');
}

// 照片載入函數
async function loadPhotosForSeason(season) {
    console.log(`🔍 開始載入 ${season} 季度的照片...`);
    
    const galleryId = `gallery-${season}`;
    const loadingId = `loading-${season}`;
    const gallery = document.getElementById(galleryId);
    const loading = document.getElementById(loadingId);
    
    if (!gallery || !loading) {
        console.error(`❌ 找不到 ${season} 的DOM元素`);
        return;
    }
    
    try {
        // 嘗試載入該季度的照片
        const photoFiles = await getPhotoFiles(season);
        console.log(`${season} 找到照片:`, photoFiles);
        
        if (photoFiles.length > 0) {
            // 隱藏載入訊息
            loading.style.display = 'none';
            
            // 修改路徑，指向正確的season資料夾
            const seasonFolder = season.replace('s', 'season');
            
            // 顯示照片
            photoFiles.forEach(fileName => {
                console.log(`🖼️ 嘗試顯示照片: ${fileName}`);
                
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                
                // 使用絕對路徑
                const imagePath = `/images/award/${seasonFolder}/${fileName}`;
                
                photoItem.onclick = () => {
                    console.log(`🔍 點擊照片，使用路徑: ${imagePath}`);
                    openLightbox(imagePath);
                };
                
                const img = document.createElement('img');
                img.src = imagePath;
                img.className = 'photo-thumbnail';
                img.alt = `${season} 賽事照片`;
                img.onload = () => {
                    console.log(`✅ 成功載入照片縮圖: ${fileName}`);
                };
                img.onerror = () => {
                    console.log(`❌ 載入照片失敗: ${fileName}`);
                    photoItem.innerHTML = `
                        <div class="photo-placeholder">
                            <div class="photo-icon">📷</div>
                            <div class="photo-title">載入失敗</div>
                        </div>
                    `;
                };
                
                photoItem.appendChild(img);
                gallery.appendChild(photoItem);
                console.log(`➕ 已添加照片元素到gallery: ${fileName}`);
            });
        } else {
            // 沒有照片時顯示佔位符
            console.log(`${season} 沒有找到照片，顯示佔位符`);
            showPlaceholders(season);
        }
    } catch (error) {
        console.log(`載入 ${season} 照片出錯:`, error);
        showPlaceholders(season);
    }
}

// 獲取照片檔案列表
async function getPhotoFiles(season) {
    console.log(`🔍 開始檢查 ${season} 季度的照片檔案...`);
    
    // 根據實際的季別資料夾和檔案名稱
    const knownFiles = {
        's4': ['IMG_9918.webp', 'IMG_9919.webp', 'IMG_9920.webp', 'IMG_9921.webp', 'IMG_9922.webp', 'IMG_9923.webp'],
        's3': ['IMG_9924.webp', 'IMG_9925.webp', 'IMG_9926.webp', 'IMG_9927.webp', 'IMG_9928.webp', 'IMG_9929.webp', 'IMG_9930.webp'],
        's2': ['IMG_9931.webp', 'IMG_9932.webp', 'IMG_9933.webp']
    };
    
    const seasonFiles = knownFiles[season] || [];
    console.log(`📋 ${season} 的已知檔案清單:`, seasonFiles);
    
    const existingFiles = [];
    
    // 修改路徑，指向正確的season資料夾
    const seasonFolder = season.replace('s', 'season');
    console.log(`📁 季度資料夾名稱: ${seasonFolder}`);
    
    for (const fileName of seasonFiles) {
        const imagePath = `/images/award/${seasonFolder}/${fileName}`;
        console.log(`🔗 檢查檔案路徑: ${imagePath}`);
        
        try {
            // 嘗試載入圖片
            const response = await fetch(imagePath);
            console.log(`📡 Fetch狀態: ${response.status} ${response.statusText} for ${fileName}`);
            
            if (response.ok) {
                console.log(`✅ 檔案存在: ${fileName} (${response.status})`);
                existingFiles.push(fileName);
            } else {
                console.log(`❌ 檔案不存在: ${fileName} (${response.status})`);
            }
        } catch (error) {
            console.log(`💥 檢查檔案失敗: ${fileName}`, error);
        }
    }
    
    console.log(`📊 ${season} 最終找到的檔案:`, existingFiles);
    return existingFiles;
}

// 顯示佔位符
function showPlaceholders(season) {
    const galleryId = `gallery-${season}`;
    const loadingId = `loading-${season}`;
    const gallery = document.getElementById(galleryId);
    const loading = document.getElementById(loadingId);
    
    if (!gallery || !loading) return;
    
    loading.textContent = `${season.toUpperCase()} 照片整理中，敬請期待！`;
    loading.className = 'loading-message';
    
    // 根據不同季度顯示不同的佔位符
    const placeholders = getPlaceholdersForSeason(season);
    
    placeholders.forEach(placeholder => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-placeholder';
        photoItem.innerHTML = `
            <div class="photo-icon">${placeholder.icon}</div>
            <div class="photo-title">${placeholder.title}</div>
        `;
        gallery.appendChild(photoItem);
    });
}

// 獲取各季度的佔位符
function getPlaceholdersForSeason(season) {
    const placeholderData = {
        's4': [
            { icon: '🏆', title: '冠軍頒獎' },
            { icon: '🥇', title: 'MVP獎項' },
            { icon: '📸', title: '大合照' },
            { icon: '🎉', title: '慶祝派對' }
        ],
        's3': [
            { icon: '🏆', title: '頒獎典禮' },
            { icon: '🎯', title: '比賽瞬間' },
            { icon: '👥', title: '團隊精神' }
        ],
        's2': [
            { icon: '💰', title: '阿淦幣發行' },
            { icon: '😈', title: '倒霉鬼獎' },
            { icon: '🏆', title: '冠軍頒獎' },
            { icon: '🍻', title: '首次消費' }
        ]
    };
    
    return placeholderData[season] || [];
}

// 燈箱功能相關變數
let currentLightboxImages = [];
let currentImageIndex = 0;

// 燈箱功能
function openLightbox(imageSrc, allImages = null, imageIndex = 0) {
    console.log('🖼️ 打開燈箱:', imageSrc);
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    if (lightbox && lightboxImg) {
        // 設定當前圖片列表和索引
        if (allImages && Array.isArray(allImages)) {
            currentLightboxImages = allImages;
            currentImageIndex = imageIndex;
        } else {
            // 如果沒有提供圖片列表，嘗試從當前頁面獲取
            currentLightboxImages = getCurrentPageImages();
            currentImageIndex = currentLightboxImages.findIndex(img => img.includes(imageSrc.split('/').pop()));
            if (currentImageIndex === -1) currentImageIndex = 0;
        }
        
        lightboxImg.src = imageSrc;
        lightbox.style.display = 'block';
        
        // 更新導航按鈕狀態
        updateNavigationButtons();
        
        console.log(`📸 燈箱已開啟，當前圖片 ${currentImageIndex + 1}/${currentLightboxImages.length}`);
    } else {
        console.log('燈箱元素未找到，改用新視窗開啟');
        window.open(imageSrc, '_blank');
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.style.display = 'none';
        currentLightboxImages = [];
        currentImageIndex = 0;
    }
}

// 燈箱導航功能
function navigateLightbox(direction) {
    if (currentLightboxImages.length === 0) return;
    
    // 計算新的索引
    const newIndex = currentImageIndex + direction;
    
    // 循環播放
    if (newIndex >= currentLightboxImages.length) {
        currentImageIndex = 0;
    } else if (newIndex < 0) {
        currentImageIndex = currentLightboxImages.length - 1;
    } else {
        currentImageIndex = newIndex;
    }
    
    // 更新圖片
    const lightboxImg = document.getElementById('lightbox-img');
    if (lightboxImg) {
        lightboxImg.src = currentLightboxImages[currentImageIndex];
        console.log(`📸 切換到圖片 ${currentImageIndex + 1}/${currentLightboxImages.length}`);
    }
    
    // 更新導航按鈕狀態
    updateNavigationButtons();
}

// 更新導航按鈕狀態
function updateNavigationButtons() {
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    if (prevBtn && nextBtn) {
        // 如果只有一張圖片，隱藏導航按鈕
        if (currentLightboxImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        }
    }
}

// 獲取當前頁面的所有圖片
function getCurrentPageImages() {
    const images = [];
    
    // 根據實際的季別資料夾和檔案名稱
    const knownFiles = {
        's4': ['IMG_9918.webp', 'IMG_9919.webp', 'IMG_9920.webp', 'IMG_9921.webp', 'IMG_9922.webp', 'IMG_9923.webp'],
        's3': ['IMG_9924.webp', 'IMG_9925.webp', 'IMG_9926.webp', 'IMG_9927.webp', 'IMG_9928.webp', 'IMG_9929.webp', 'IMG_9930.webp'],
        's2': ['IMG_9931.webp', 'IMG_9932.webp', 'IMG_9933.webp']
    };
    
    // 收集所有季度的圖片
    ['s4', 's3', 's2'].forEach(season => {
        const seasonFolder = season.replace('s', 'season');
        const seasonFiles = knownFiles[season] || [];
        seasonFiles.forEach(fileName => {
            images.push(`/images/award/${seasonFolder}/${fileName}`);
        });
    });
    
    return images;
}

// 鍵盤導航支援
function handleLightboxKeyboard(event) {
    if (document.getElementById('lightbox').style.display === 'block') {
        switch(event.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                navigateLightbox(-1);
                break;
            case 'ArrowRight':
                navigateLightbox(1);
                break;
        }
    }
}

// 添加鍵盤事件監聽器
document.addEventListener('keydown', handleLightboxKeyboard);

// 添加到window物件，讓awards.html能夠調用
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateLightbox = navigateLightbox;

// 照片輪播功能
let carouselImages = [];
let currentCarouselIndex = 0;
let carouselInterval = null;

// 初始化照片輪播
function initializePhotoCarousel() {
    console.log('🎠 開始初始化照片輪播...');
    
    // Season 5 的照片列表 - 使用 WebP 格式以改善性能
    const season5Images = [
        '/images/award/season5/season5_01.webp',
        '/images/award/season5/season5_02.webp',
        '/images/award/season5/season5_03.webp',
        '/images/award/season5/season5_04.webp',
        '/images/award/season5/season5_05.webp',
        '/images/award/season5/season5_06.webp',
        '/images/award/season5/season5_07.webp',
        '/images/award/season5/season5_08.webp',
        '/images/award/season5/season5_09.webp',
        '/images/award/season5/season5_10.webp',
        '/images/award/season5/season5_11.webp',
        '/images/award/season5/season5_12.webp',
        '/images/award/season5/season5_13.webp',
        '/images/award/season5/season5_14.webp',
        '/images/award/season5/season5_15.webp',
        '/images/award/season5/season5_16.webp',
        '/images/award/season5/season5_17.webp'
    ];
    
    // 隨機打亂照片順序 (Fisher-Yates shuffle)
    for (let i = season5Images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [season5Images[i], season5Images[j]] = [season5Images[j], season5Images[i]];
    }
    
    carouselImages = season5Images;
    
    // 檢查DOM元素是否存在
    const carouselImage = document.getElementById('carousel-image');
    const carouselDots = document.getElementById('carousel-dots');
    
    if (!carouselImage || !carouselDots) {
        console.log('❌ 輪播元素未找到');
        return;
    }
    
    // 初始化圓點指示器
    createCarouselDots();
    
    // 載入第一張圖片
    if (carouselImages.length > 0) {
        loadCarouselImage(0);
        startCarouselAutoPlay();
        console.log(`✅ 照片輪播初始化完成，共 ${carouselImages.length} 張照片`);
    }
}



// 創建輪播圓點
function createCarouselDots() {
    const carouselDots = document.getElementById('carousel-dots');
    if (!carouselDots) return;
    
    carouselDots.innerHTML = '';
    
    carouselImages.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'carousel-dot';
        if (index === 0) dot.classList.add('active');
        
        dot.addEventListener('click', () => {
            goToCarouselImage(index);
        });
        
        carouselDots.appendChild(dot);
    });
}

// 全局變數來控制動畫狀態
let isCarouselAnimating = false;

// 輪播狀態追蹤：哪個圖片元素當前是主要的
let currentMainImageId = 'carousel-image';

// 載入指定索引的圖片（簡化版 - 使用 opacity 淡入淡出）
function loadCarouselImage(index) {
    const carouselImage = document.getElementById('carousel-image');
    if (!carouselImage || !carouselImages[index]) return;
    
    // 同步更新當前索引
    currentCarouselIndex = index;
    
    // 如果正在動畫中，跳過
    if (isCarouselAnimating) return;
    
    isCarouselAnimating = true;
    
    // 淡出當前圖片
    carouselImage.style.opacity = '0';
    
    // 等待淡出完成後更換圖片
    setTimeout(() => {
        carouselImage.src = carouselImages[index];
        // 淡入新圖片
        carouselImage.style.opacity = '1';
        
        // 更新圓點
        updateCarouselDots(index);
        
        isCarouselAnimating = false;
        
        console.log(`✅ 切換到第 ${index + 1} 張圖片`);
    }, 500);
}

// 設置圖片點擊事件的輔助函數
function setupImageClickEvent(imageElement) {
    imageElement.onclick = () => {
        if (parent && parent.loadContent) {
            parent.loadContent('awards');
        } else {
            window.location.href = '../pages/awards.html';
        }
    };
    imageElement.style.cursor = 'pointer';
}

// 更新圓點指示器
function updateCarouselDots(activeIndex) {
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        if (index === activeIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// 跳轉到指定圖片
function goToCarouselImage(index) {
    if (index >= 0 && index < carouselImages.length) {
        currentCarouselIndex = index;
        loadCarouselImage(index);
        
        // 重啟自動播放
        stopCarouselAutoPlay();
        startCarouselAutoPlay();
    }
}

// 下一張圖片
function nextCarouselImage() {
    const previousIndex = currentCarouselIndex;
    currentCarouselIndex = (currentCarouselIndex + 1) % carouselImages.length;
    console.log(`🔄 照片切換: ${previousIndex + 1} → ${currentCarouselIndex + 1} (共${carouselImages.length}張)`);
    
    // 如果回到第一張，顯示循環提示
    if (previousIndex === carouselImages.length - 1 && currentCarouselIndex === 0) {
        console.log('🔁 照片輪播已循環回到第一張');
    }
    
    loadCarouselImage(currentCarouselIndex);
}

// 開始自動播放
function startCarouselAutoPlay() {
    if (carouselImages.length <= 1) return;
    
    carouselInterval = setInterval(() => {
        nextCarouselImage();
    }, 7000); // 每7秒切換
    
    console.log('▶️ 照片輪播自動播放已開始');
}

// 停止自動播放
function stopCarouselAutoPlay() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
        console.log('⏸️ 照片輪播自動播放已停止');
    }
}

// 當頁面切換時停止輪播
function stopCarouselOnPageChange() {
    stopCarouselAutoPlay();
    carouselImages = [];
    currentCarouselIndex = 0;
    isCarouselAnimating = false; // 重置動畫狀態
    currentMainImageId = 'carousel-image'; // 重置主圖片引用
}