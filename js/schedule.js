// 測試模式設定
const TEST_MODE = true;

const TEST_DATA = {
    values: [
        ["第1週：11/5"],
        ["", "逃生入口A", "", "vs", "", "逃生入口C", "逃生入口 Exit Bar"],
        // ... 其他測試數據 ...
    ]
};

// 初始化函數
window.initSchedule = function() {
    console.log('Schedule initialization started');
    const table = document.getElementById('leagueTable');
    if (!table) {
        console.error('Table element not found during initialization');
        return;
    }
    loadSheetData();
};

async function loadSheetData() {
    console.log('Loading sheet data');
    if (TEST_MODE) {
        console.log('Using test data');
        updateTable(TEST_DATA.values);
        return;
    }
    // ... API 相關程式碼 ...
}

function updateTable(data) {
    console.log('Updating table');
    const table = document.getElementById('leagueTable');
    if (!table) {
        console.error('Table element not found in updateTable');
        return;
    }
    // ... 更新表格的程式碼 ...
}

// ... 其他函數 ... 