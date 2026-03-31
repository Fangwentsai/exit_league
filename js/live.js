/**
 * 處理直播中心的動態資料邏輯
 */

// =================== 請填寫以下設定 ===================

// 請替換為您將 google-apps-script-live.js 部署後的網頁應用程式網址 (Web App URL)
const LIVE_GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyVkme-CZnP06A0-K-eq93h8QXNvPGLCyW4ODAXwqmQg5EqXO1ogRlmkYvcdV9n3tA/exec';

// ===================================================

/**
 * 檢查目前是否有直播，如果有則初始化 YouTube 播放器
 */
async function checkLiveStream() {
    const liveContainer = document.getElementById('live-player-container');
    if (!liveContainer) return;

    // 顯示載入中的動畫與提示
    renderLoadingState(liveContainer);

    try {
        if (!LIVE_GAS_API_URL || LIVE_GAS_API_URL.trim() === '') {
            // 還沒設定 API URL，預設顯示「無直播」
            console.warn('尚未設定 LIVE_GAS_API_URL，目前預設為無直播模式。');
            renderNoLiveState(liveContainer);
            return;
        }

        // 向 GAS 後端發送請求
        const response = await fetch(LIVE_GAS_API_URL);
        const result = await response.json();

        console.log('Live Stream Data:', result);

        if (result.success && result.data && result.data.length > 0) {
            // 讀取成功且今天有正在進行的直播！(這裡抓第一筆正在直播的)
            const liveVideoId = result.data[0].videoId;
            renderLivePlayer(liveContainer, liveVideoId);
        } else {
            // 沒有直播，或是直播已經過期結束了
            renderNoLiveState(liveContainer);
        }
    } catch (error) {
        console.error('抓取直播資料時發生意外連線失敗:', error);
        // 出錯時安全降級為「無直播」，不破壞畫面
        renderNoLiveState(liveContainer);
    }
}

function renderLoadingState(container) {
    container.innerHTML = `
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #dc3545; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
            <div style="color: #6c757d; font-size: 14px; font-weight: bold;">後台雷達正在為您巡邏各大賽事頻道...</div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;
}

function renderNoLiveState(container) {
    container.innerHTML = `
        <div class="no-live-msg" style="background-color: #f8f9fa; color: #6c757d; padding: 20px; text-align: center; border-radius: 8px; font-style: italic; margin-bottom: 30px;">
            > 目前暫無職業飛鏢線上直播。
            <br>
            <span style="font-size: 12px; margin-top: 5px; display: inline-block;">系統將於下次開賽時自動偵測並切換本畫面</span>
        </div>
    `;
}

function renderLivePlayer(container, liveId) {
    container.innerHTML = `
        <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
            <span class="status-badge" style="display: inline-block; background-color: #dc3545; color: white; font-size: 14px; padding: 4px 10px; border-radius: 20px; font-weight: bold; animation: pulse 2s infinite;">🔴 正在直播</span>
            <strong style="font-size: 18px;">為您擷取到最新的賽事實況</strong>
        </div>
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 8px; box-shadow: 0 6px 15px rgba(0,0,0,0.15); margin-bottom: 40px;">
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

// 如果獨立載入此腳本，嘗試直接執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLiveStream);
} else {
    // 可能是被動態寫入 innerHTML 的
    // checkLiveStream();
}

// 註冊到 window 讓 main.js 接管
window.initLivePage = checkLiveStream;
