// scripts/index.js
// 只是一個包裝腳本，用來加載主要的JS文件

// 確保在頁面加載完成後執行
$(document).ready(function() {
    // 動態載入main.js - 修正路徑問題
    const mainScript = document.createElement('script');
    mainScript.src = '../js/main.js'; // 修正相對路徑
    document.body.appendChild(mainScript);
}); 