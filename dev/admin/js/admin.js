// 開發環境後台管理系統 JavaScript

console.log('🚧 開發環境後台系統已載入');
console.log('環境: Development');
console.log('域名: dev.yhdarts.com');

// 檢查是否在開發環境
const isDev = window.location.hostname.includes('dev.yhdarts.com') || 
              window.location.hostname === 'localhost';

if (isDev) {
    console.log('✅ 開發環境確認');
} else {
    console.warn('⚠️ 非開發環境');
}

// 導航功能
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有 active 狀態
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 添加當前 active 狀態
            this.classList.add('active');
            
            const target = this.getAttribute('href').substring(1);
            console.log('導航到:', target);
            
            // 這裡可以添加實際的頁面切換邏輯
        });
    });
    
    // 按鈕點擊事件
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('按鈕點擊:', this.textContent);
            alert('功能開發中：' + this.textContent);
        });
    });
});

// 開發環境工具函數
const DevTools = {
    log: function(message, data) {
        if (isDev) {
            console.log(`[DEV] ${message}`, data || '');
        }
    },
    
    error: function(message, error) {
        if (isDev) {
            console.error(`[DEV ERROR] ${message}`, error || '');
        }
    },
    
    info: function(message) {
        if (isDev) {
            console.info(`[DEV INFO] ${message}`);
        }
    }
};

// 匯出開發工具
window.DevTools = DevTools;

// 歡迎訊息
DevTools.info('後台管理系統已就緒');
DevTools.info('開始開發新功能吧！');

