/**
 * 處理直播中心的動態資料邏輯
 */

// =================== 請填寫以下設定 ===================

// 請替換為您將 google-apps-script-live.js 部署後的網頁應用程式網址 (Web App URL)
const LIVE_GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyVkme-CZnP06A0-K-eq93h8QXNvPGLCyW4ODAXwqmQg5EqXO1ogRlmkYvcdV9n3tA/exec';

// ===================================================

// 全域快取，避免切換頁面時重複呼叫 API
window.liveStreamCache = window.liveStreamCache || {
    data: null,
    timestamp: 0
};
const CACHE_MINUTES = 5; // 快取有效時間：5分鐘

/**
 * 檢查目前是否有直播，如果有則初始化 YouTube 播放器
 */
window.checkLiveStream = async function() {
    console.log('checkLiveStream() 觸發執行');
    const liveContainer = document.getElementById('live-player-container');
    if (!liveContainer) {
        console.warn('找不到 live-player-container，取消直播檢查');
        return;
    }

    // 防止同一個容器重複執行
    if (liveContainer.dataset.initialized === 'true') {
        console.log('直播檢查已經執行過了，跳過');
        return;
    }
    liveContainer.dataset.initialized = 'true';

    try {
        if (!LIVE_GAS_API_URL || LIVE_GAS_API_URL.trim() === '') {
            console.warn('尚未設定 LIVE_GAS_API_URL，目前預設為無直播模式。');
            renderNoLiveState(liveContainer);
            return;
        }

        const now = Date.now();
        const cacheValidTime = CACHE_MINUTES * 60 * 1000;
        let result;

        // 如果快取有效，直接秒開，不顯示「後台雷達」載入動畫
        if (window.liveStreamCache.data && (now - window.liveStreamCache.timestamp < cacheValidTime)) {
            console.log('✅ 使用快取的直播資料，不重新呼叫 API');
            result = window.liveStreamCache.data;
        } else {
            // 需要呼叫 API 時才顯示載入中的動畫
            renderLoadingState(liveContainer);

            console.log('開始 Fetch API:', LIVE_GAS_API_URL);
            const response = await fetch(LIVE_GAS_API_URL);
            result = await response.json();
            
            // 寫入快取
            if (result.success) {
                window.liveStreamCache.data = result;
                window.liveStreamCache.timestamp = now;
            }
        }

        console.log('Live Stream Data:', result);

        // 如果成功且有資料，且狀態是 live (或者是預設有的影片 ID)
        if (result.success && result.data && result.data.length > 0) {
            // 找出狀態是 'live' 的第一筆，或者直接用第一筆的影片 ID 防呆
            const liveData = result.data.find(d => d.status === 'live' || d.videoId) || result.data[0];
            const liveVideoId = liveData.videoId;
            
            if (liveVideoId) {
                renderLivePlayer(liveContainer, liveVideoId);
                console.log('成功渲染播放器，Video ID:', liveVideoId);
            } else {
                console.warn('API 成功但沒有有效的 videoId');
                renderNoLiveState(liveContainer);
            }
        } else {
            // 沒有直播，或是直播已經過期結束了
            console.log('API 回傳無直播資料');
            renderNoLiveState(liveContainer);
        }
    } catch (error) {
        console.error('抓取直播資料時發生意外連線失敗:', error);
        renderNoLiveState(liveContainer);
    }
};

function renderLoadingState(container) {
    container.innerHTML = `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 10px;">
            <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #dc3545; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
            <div style="color: #6c757d; font-size: 14px; font-weight: bold;">後台雷達正在為您巡邏各大賽事頻道...</div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
}

function renderNoLiveState(container) {
    container.innerHTML = `
        <div class="no-live-msg" style="background-color: #f8f9fa; color: #6c757d; padding: 12px; text-align: center; border-radius: 8px; font-style: italic; margin-bottom: 5px;">
            > 目前暫無職業飛鏢線上直播。
            <br>
            <span style="font-size: 12px; margin-top: 5px; display: inline-block;">系統將於下次開賽時自動偵測並切換本畫面</span>
        </div>
    `;
}

function renderLivePlayer(container, liveId) {
    container.innerHTML = `
        <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 10px;">
            <span class="status-badge" style="display: inline-block; background-color: #dc3545; color: white; font-size: 13px; padding: 3px 8px; border-radius: 20px; font-weight: bold; animation: pulse 2s infinite;">🔴 正在直播</span>
            <strong style="font-size: 16px;">為您擷取到最新的賽事實況</strong>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 15px;">
            <iframe
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
                src="https://www.youtube.com/embed/${liveId}?autoplay=1&mute=1&rel=0"
                allow="autoplay; encrypted-media"
                allowfullscreen>
            </iframe>
        </div>
        <style>@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }</style>
    `;
}

// ============== 提供給網站 SPA 的入口點 ==============

window.initLivePage = window.checkLiveStream;

// 被動式自動偵測：使用 MutationObserver 監聽 DOM 變化
// 這樣不論 main.js 怎麼寫、或是否被 Cache，只要 live-player-container 出現就能自動觸發
console.log('✅ live.js 載入成功，已啟動畫面偵測器。');
const observer = new MutationObserver((mutations, obs) => {
    const container = document.getElementById('live-player-container');
    if (container && container.innerHTML.trim() === '' && container.dataset.initialized !== 'true') {
        window.checkLiveStream();
    }
});

if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        // 初始檢查
        const container = document.getElementById('live-player-container');
        if (container && container.innerHTML.trim() === '') window.checkLiveStream();
    });
}
