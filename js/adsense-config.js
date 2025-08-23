/**
 * Google AdSense 配置文件
 * 請將 4455508862703492 和 auto 替換為你的實際 AdSense 資訊
 */

// AdSense 配置
const ADSENSE_CONFIG = {
    publisherId: 'ca-pub-4455508862703492', // 替換為你的發布商 ID
    adSlots: {
        banner: 'YOUR_BANNER_AD_SLOT_ID',     // 橫幅廣告槽 ID
        sidebar: 'YOUR_SIDEBAR_AD_SLOT_ID',   // 側邊欄廣告槽 ID
        footer: 'YOUR_FOOTER_AD_SLOT_ID'      // 頁尾廣告槽 ID
    }
};

/**
 * 初始化 AdSense 廣告
 */
function initializeAdSense() {
    // 確保 adsbygoogle 已載入
    if (typeof window.adsbygoogle !== 'undefined') {
        try {
            // 推送所有廣告
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log('✅ AdSense 廣告已初始化');
        } catch (error) {
            console.error('❌ AdSense 初始化失敗:', error);
        }
    } else {
        console.warn('⚠️ AdSense 腳本尚未載入');
    }
}

/**
 * 創建廣告元素
 * @param {string} slotId - 廣告槽 ID
 * @param {string} format - 廣告格式（default: 'auto'）
 * @param {boolean} responsive - 是否響應式（default: true）
 */
function createAdElement(slotId, format = 'auto', responsive = true) {
    const adContainer = document.createElement('div');
    adContainer.className = 'adsense-container';
    adContainer.style.cssText = 'text-align: center; margin: 20px 0; padding: 10px;';
    
    const adElement = document.createElement('ins');
    adElement.className = 'adsbygoogle';
    adElement.style.cssText = 'display:block';
    adElement.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
    adElement.setAttribute('data-ad-slot', slotId);
    adElement.setAttribute('data-ad-format', format);
    
    if (responsive) {
        adElement.setAttribute('data-full-width-responsive', 'true');
    }
    
    adContainer.appendChild(adElement);
    
    // 廣告腳本
    const script = document.createElement('script');
    script.textContent = '(adsbygoogle = window.adsbygoogle || []).push({});';
    adContainer.appendChild(script);
    
    return adContainer;
}

/**
 * 在指定元素後插入廣告
 * @param {Element} targetElement - 目標元素
 * @param {string} slotId - 廣告槽 ID
 */
function insertAdAfter(targetElement, slotId) {
    if (targetElement && slotId) {
        const adElement = createAdElement(slotId);
        targetElement.parentNode.insertBefore(adElement, targetElement.nextSibling);
    }
}

/**
 * 頁面載入完成後自動初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 延遲初始化以確保頁面內容載入完成
    setTimeout(initializeAdSense, 1000);
});

// 導出配置供其他腳本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADSENSE_CONFIG, initializeAdSense, createAdElement, insertAdAfter };
}
