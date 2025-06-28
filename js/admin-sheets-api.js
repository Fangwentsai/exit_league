/**
 * Admin Google Sheets API 處理模組
 * 負責與 Google Sheets 的所有互動功能
 */

// Google Sheets API 配置
const SHEETS_CONFIG = {
    CLIENT_ID: '945502427007-dq3ldlv77r1u0h6me3s6jj948dajk6gm.apps.googleusercontent.com',
    API_KEY: 'AIzaSyDtba1arudetdcnc3yd3ri7Q35HlAndjr0',
    SCHEDULE_SHEET_ID: '1UV-uMGibCmqPqhlMCqmNH2Z_fBQQTJQcqTGjkBQNiOE', // 讀取比賽場次
    RESULT_SHEET_ID: '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE'    // 寫入比賽結果
};

// Google Apps Script URL (用於保存資料)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec';

/**
 * 動態載入比賽資料
 * 從 Google Sheets 載入前後三天的比賽資料
 */
async function loadGames() {
    try {
        document.getElementById('loadingGames').style.display = 'block';
        document.getElementById('loadingGames').textContent = '載入比賽資料中...';
        
        // 獲取相關的日期範圍（前3天到後3天）
        const today = new Date();
        const dates = [];
        
        for (let i = 3; i >= -3; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(date);
        }
        
        console.log('🗓️ 搜尋日期範圍:', dates.map(d => formatDate(d)));
        
        // 從 Google Sheets 載入比賽資料
        const games = await loadGamesFromSheet(dates);
        
        const select = document.getElementById('gameSelect');
        select.innerHTML = '<option value="">請選擇比賽...</option>';
        
        if (games.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '目前沒有可用的比賽';
            option.disabled = true;
            select.appendChild(option);
        } else {
            // 按 gamecode 數字排序（g41, g42, g43, g44...）
            games.sort((a, b) => {
                // 提取數字部分進行比較
                const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
                const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
                return aNum - bNum; // 改為升序，由小到大排列
            });
            
            games.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id;
                option.textContent = `${game.id.toUpperCase()} (${game.date}) - ${game.away} vs ${game.home}`;
                select.appendChild(option);
            });
        }

        document.getElementById('loadingGames').style.display = 'none';
        
    } catch (error) {
        console.error('載入比賽資料失敗:', error);
        document.getElementById('loadingGames').textContent = '載入失敗，請重新整理頁面';
    }
}

/**
 * 格式化日期為 M/D 格式
 */
function formatDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 從 Google Sheets 載入比賽資料
 * 支援多種工作表名稱和格式
 */
async function loadGamesFromSheet(targetDates) {
    try {
        console.log('🔍 開始從 Google Sheets 載入比賽資料...');
        
        // 嘗試多種可能的工作表名稱
        const possibleSheetNames = [
            'schedule',      // 原始名稱
            'Schedule',      // 首字母大寫
            'SCHEDULE',      // 全大寫
            'schedule_s4',   // 季度工作表
            'Schedule_S4',   // 季度工作表（大寫）
            '工作表1',        // 預設中文名稱
            'Sheet1'         // 預設英文名稱
        ];
        
        let games = [];
        let successfulSheet = null;
        
        // 逐一嘗試不同的工作表名稱
        for (const sheetName of possibleSheetNames) {
            try {
                console.log(`🔄 嘗試工作表: ${sheetName}`);
                
                const range = `${sheetName}!A:H`;
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.SCHEDULE_SHEET_ID}/values/${range}?key=${SHEETS_CONFIG.API_KEY}`;
                
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.values && data.values.length > 0) {
                        console.log(`✅ 成功讀取工作表: ${sheetName}`);
                        games = parseGamesData(data.values, targetDates);
                        successfulSheet = sheetName;
                        break;
                    }
                } else if (response.status === 400) {
                    // 工作表不存在，繼續嘗試下一個
                    console.log(`❌ 工作表不存在: ${sheetName}`);
                    continue;
                } else {
                    console.error(`❌ API 錯誤 (${sheetName}):`, response.status, response.statusText);
                }
                
            } catch (error) {
                console.log(`❌ 讀取工作表失敗 (${sheetName}):`, error.message);
                continue;
            }
        }
        
        if (games.length > 0) {
            console.log(`✅ 成功從工作表 "${successfulSheet}" 載入 ${games.length} 場比賽`);
            return games;
        } else {
            console.log('⚠️ 所有工作表都無法讀取，使用備用資料');
            return getStaticGames(targetDates);
        }
        
    } catch (error) {
        console.error('❌ 從 Google Sheets 載入比賽資料失敗:', error);
        console.log('🔄 使用備用靜態資料');
        return getStaticGames(targetDates);
    }
}

/**
 * 解析 Google Sheets 的比賽資料
 */
function parseGamesData(values, targetDates) {
    const games = [];
    const targetDateStrings = targetDates.map(date => formatDate(date));
    
    console.log('🎯 目標日期:', targetDateStrings);
    console.log('📊 Google Sheets 原始資料 (前10行):', values.slice(0, 10));
    
    // 從第二行開始（跳過標題行）
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        
        // 根據表格格式：A=比賽ID, B=日期, C=客隊, D=客場分數, E=vs, F=主場分數, G=主隊
        if (row.length >= 7) {
            const gameId = row[0] ? row[0].toLowerCase().trim() : '';    // A欄：比賽ID (G44, G45...)
            const gameDate = row[1] ? row[1].trim() : '';               // B欄：日期 (6/17, 6/24...)
            const awayTeam = row[2] ? row[2].trim() : '';               // C欄：客隊
            const homeTeam = row[6] ? row[6].trim() : '';               // G欄：主隊
            
            console.log(`📝 處理第${i}行:`, { gameId, gameDate, awayTeam, homeTeam });
            
            // 檢查必要欄位是否存在且日期在目標範圍內
            if (gameDate && gameId && awayTeam && homeTeam) {
                // 檢查日期是否在目標範圍內（支援多種日期格式）
                if (isDateInRange(gameDate, targetDateStrings)) {
                    games.push({
                        id: gameId,
                        date: gameDate,
                        dateObj: parseGameDate(gameDate),
                        away: awayTeam,
                        home: homeTeam
                    });
                    console.log(`✅ 加入比賽: ${gameId} - ${awayTeam} vs ${homeTeam} (${gameDate})`);
                }
            }
        }
    }
    
    console.log('📋 從 Google Sheets 解析的比賽:', games);
    return games;
}

/**
 * 檢查日期是否在目標範圍內
 * 支援多種日期格式：M/D, MM/DD, YYYY/M/D 等
 */
function isDateInRange(gameDate, targetDateStrings) {
    // 直接比對
    if (targetDateStrings.includes(gameDate)) {
        return true;
    }
    
    // 嘗試解析日期並格式化為 M/D 格式
    try {
        const parsedDate = parseGameDate(gameDate);
        const formattedDate = formatDate(parsedDate);
        return targetDateStrings.includes(formattedDate);
    } catch (error) {
        console.log(`⚠️ 無法解析日期: ${gameDate}`);
        return false;
    }
}

/**
 * 解析比賽日期
 * 支援多種格式：M/D, MM/DD, YYYY/M/D, YYYY-MM-DD 等
 */
function parseGameDate(dateString) {
    if (!dateString) return new Date();
    
    // 移除空白字元
    dateString = dateString.trim();
    
    // 支援的格式
    const formats = [
        // M/D 格式
        /^(\d{1,2})\/(\d{1,2})$/,
        // YYYY/M/D 格式
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
        // YYYY-MM-DD 格式
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    ];
    
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            if (match.length === 3) {
                // M/D 格式
                const month = parseInt(match[1]) - 1; // JavaScript 月份從 0 開始
                const day = parseInt(match[2]);
                const year = new Date().getFullYear(); // 假設是當年
                return new Date(year, month, day);
            } else if (match.length === 4) {
                // YYYY/M/D 或 YYYY-MM-DD 格式
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                const day = parseInt(match[3]);
                return new Date(year, month, day);
            }
        }
    }
    
    // 如果都無法解析，返回當前日期
    console.warn(`無法解析日期格式: ${dateString}`);
    return new Date();
}

/**
 * 備用靜態比賽資料
 * 當無法從 Google Sheets 讀取時使用
 */
function getStaticGames(targetDates) {
    console.log('📋 使用備用靜態比賽資料');
    
    const allGames = [
        // 最新比賽
        { id: 'g50', date: '12/30', away: 'Jack', home: '人生揪難' },
        { id: 'g49', date: '12/30', away: '海盜揪硬', home: 'Vivi朝酒晚舞' },
        { id: 'g48', date: '6/24', away: 'Jack', home: '人生揪難' },
        { id: 'g47', date: '6/24', away: '海盜揪硬', home: 'Vivi朝酒晚舞' },
        { id: 'g46', date: '6/24', away: '一鏢開天門', home: '逃生入口C' },
        { id: 'g45', date: '6/24', away: '逃生入口A', home: '逃生入口C' },
        
        // 昨天的比賽
        { id: 'g44', date: '6/17', away: '逃生入口C', home: 'Jack' },
        { id: 'g43', date: '6/17', away: 'Vivi朝酒晚舞', home: '人生揪難' },
        { id: 'g42', date: '6/17', away: '海盜揪硬', home: '酒空組' },
        { id: 'g41', date: '6/17', away: '逃生入口A', home: '一鏢開天門' },
        
        // 前天的比賽
        { id: 'g40', date: '6/16', away: '海盜揪硬', home: '一鏢開天門' },
        { id: 'g39', date: '6/16', away: 'Vivi朝酒晚舞', home: '逃生入口C' },
        { id: 'g38', date: '6/16', away: 'Jack', home: '酒空組' },
        { id: 'g37', date: '6/16', away: '人生揪難', home: '逃生入口A' },
    ];
    
    const targetDateStrings = targetDates.map(date => formatDate(date));
    
    return allGames.filter(game => targetDateStrings.includes(game.date))
                  .map(game => ({
                      ...game,
                      dateObj: parseGameDate(game.date)
                  }))
                  .sort((a, b) => {
                      // 按 gamecode 數字排序（降序，最新的在前面）
                      const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
                      const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
                      return bNum - aNum;
                  });
}

/**
 * 保存比賽資料到 Google Sheets
 */
async function saveGameDataToSheets(gameData) {
    try {
        console.log('📡 開始保存資料到 Google Sheets...');
        console.log('🎮 比賽資料:', gameData);
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(gameData)
        });
        
        console.log('📊 伺服器回應狀態:', response.status, response.statusText);
        
        if (response.ok) {
            const resultText = await response.text();
            console.log('📄 伺服器回應內容:', resultText);
            
            try {
                const result = JSON.parse(resultText);
                if (result.status === 'success') {
                    console.log('✅ 保存成功:', result);
                    return {
                        success: true,
                        data: result
                    };
                } else {
                    throw new Error(result.message || '保存失敗');
                }
            } catch (parseError) {
                console.error('❌ 解析回應失敗:', parseError);
                
                // 如果無法解析 JSON，但狀態碼是 200，可能還是成功了
                if (resultText.includes('success') || resultText.includes('成功') || resultText.includes('"status":"success"')) {
                    console.log('✅ 保存可能成功（基於回應內容判斷）');
                    return {
                        success: true,
                        message: '保存完成'
                    };
                } else {
                    throw new Error('伺服器回應格式錯誤：' + resultText.substring(0, 100));
                }
            }
        } else {
            const errorText = await response.text();
            console.error('❌ HTTP 錯誤:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ 保存到 Google Sheets 失敗:', error);
        
        return {
            success: false,
            error: error.message,
            details: {
                type: error.name,
                message: error.message
            }
        };
    }
}

/**
 * 測試 Google Sheets API 連線
 */
async function testSheetsConnection() {
    try {
        console.log('🔍 測試 Google Sheets API 連線...');
        
        // 測試讀取比賽資料
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.SCHEDULE_SHEET_ID}/values/A1:A1?key=${SHEETS_CONFIG.API_KEY}`;
        
        const response = await fetch(testUrl);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Google Sheets API 連線正常');
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.error('❌ Google Sheets API 連線失敗:', response.status, errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ 測試連線時發生錯誤:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 獲取工作表列表
 * 用於診斷可用的工作表
 */
async function getSheetsList() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.SCHEDULE_SHEET_ID}?key=${SHEETS_CONFIG.API_KEY}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            const sheets = data.sheets.map(sheet => sheet.properties.title);
            console.log('📋 可用的工作表:', sheets);
            return { success: true, sheets };
        } else {
            const errorText = await response.text();
            console.error('❌ 獲取工作表列表失敗:', response.status, errorText);
            return { success: false, error: errorText };
        }
        
    } catch (error) {
        console.error('❌ 獲取工作表列表時發生錯誤:', error);
        return { success: false, error: error.message };
    }
}

// 匯出函數供其他模組使用
window.SheetsAPI = {
    loadGames,
    saveGameDataToSheets,
    testSheetsConnection,
    getSheetsList,
    SHEETS_CONFIG,
    SCRIPT_URL
}; 