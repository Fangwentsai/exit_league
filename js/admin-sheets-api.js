/**
 * Admin Google Sheets API 處理模組
 * 負責與 Google Sheets 的所有互動功能
 */

// Google Sheets API 配置
const SHEETS_CONFIG = {
    CLIENT_ID: '945502427007-dq3ldlv77r1u0h6me3s6jj948dajk6gm.apps.googleusercontent.com',
    API_KEY: 'AIzaSyDtba1arudetdcnc3yd3ri7Q35HlAndjr0',
    SCHEDULE_SHEET_ID: '1qc08K2zPsHm9g5Deku-yshYfggosTZdWIyFg7nqEEOM', // 讀取比賽場次 (第六屆)
    RESULT_SHEET_ID: '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE'    // 寫入比賽結果
};

// Google Apps Script URL (用於保存資料)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw96zr198osWO2HIeFbKMaHaM3-WqkHcDJ1F_OmTJdulf3Euv2E9K7LrdRpMORMr5lW/exec';

/**
 * 動態載入比賽資料
 * 從 Google Sheets 載入前後三天的比賽資料
 */
async function loadGames() {
    try {
        console.log('🚀 開始載入比賽資料...');
        document.getElementById('loadingGames').style.display = 'block';
        document.getElementById('loadingGames').textContent = '載入比賽資料中...';
        
        // 獲取相關的日期範圍（前3天到後3天）
        const today = new Date();
        console.log('📅 當前日期:', today.toLocaleDateString());
        const targetDates = [];
        
        for (let i = -3; i <= 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            // 轉換成M/D格式以匹配Google Sheets的日期格式 (8/26, 8/27...)
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
            targetDates.push(formattedDate);
        }
        
        console.log('🗓️ 搜尋日期範圍:', targetDates);
        console.log('🔧 使用的API配置:', {
            API_KEY: SHEETS_CONFIG.API_KEY,
            SHEET_ID: SHEETS_CONFIG.SCHEDULE_SHEET_ID
        });
        
        // 從 Google Sheets 載入比賽資料
        console.log('📡 開始呼叫Google Sheets API...');
        const games = await loadGamesFromSheet(targetDates);
        console.log(`📊 API回傳 ${games.length} 場比賽:`, games);
        
        const select = document.getElementById('gameSelect');
        select.innerHTML = '<option value="">請選擇比賽...</option>';
        
        if (games.length === 0) {
            console.log('⚠️ 沒有找到比賽，使用備用資料或檢查API');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '目前沒有可用的比賽';
            option.disabled = true;
            select.appendChild(option);
        } else {
            console.log(`✅ 成功載入 ${games.length} 場比賽`);
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
        
        // 嘗試多種可能的工作表名稱（根據API測試結果更新）
        const possibleSheetNames = [
            //'賽程',          // 中文工作表名稱（API測試確認存在）
            'schedule'       // 英文工作表名稱（API測試確認存在）
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
    // targetDates 現在已經是字串陣列格式 ["8/26", "8/27", ...]
    const targetDateStrings = targetDates;
    
    console.log('🎯 目標日期:', targetDateStrings);
    console.log('📊 Google Sheets 原始資料 (前10行):', values.slice(0, 10));
    
    // 從第二行開始（跳過標題行）
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        
        // 根據實際Google Sheets結構：A=遊戲編號, B=日期, C=客場隊伍, G=主場隊伍  
        if (row.length >= 7) {
            const gameId = row[0] ? row[0].trim() : '';                 // A欄：遊戲編號 (G01, G02...)
            const gameDate = row[1] ? row[1].trim() : '';               // B欄：日期 (8/19, 8/26...)
            const awayTeam = row[2] ? row[2].trim() : '';               // C欄：客場隊伍
            const homeTeam = row[6] ? row[6].trim() : '';               // G欄：主場隊伍
            
            console.log(`📝 處理第${i}行:`, { 
                gameId, 
                gameDate, 
                awayTeam, 
                homeTeam,
                '完整行數據': row
            });
            
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
    console.log(`🔍 檢查日期 "${gameDate}" 是否在範圍內:`, targetDateStrings);
    
    // 直接比對
    if (targetDateStrings.includes(gameDate)) {
        console.log(`✅ 直接匹配: ${gameDate}`);
        return true;
    }
    
    // 嘗試解析Google Sheets的日期並格式化為 M/D 格式進行比對
    try {
        const parsedDate = parseGameDate(gameDate);
        const formattedDate = formatDate(parsedDate);
        console.log(`🔄 格式化後的日期: ${gameDate} -> ${formattedDate}`);
        
        const isInRange = targetDateStrings.includes(formattedDate);
        console.log(`${isInRange ? '✅' : '❌'} 比對結果: ${formattedDate} in [${targetDateStrings.join(', ')}] = ${isInRange}`);
        return isInRange;
    } catch (error) {
        console.log(`⚠️ 無法解析日期: ${gameDate}`, error);
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
        // 當前週的比賽（8/26-9/1）
        { id: 'g61', date: '8/26', away: '逃生入口A', home: 'VIVI朝酒晚舞' },
        { id: 'g62', date: '8/26', away: '酒空組', home: 'Jack' },
        { id: 'g63', date: '8/27', away: '一鏢開天門', home: '逃生入口C' },
        { id: 'g64', date: '8/27', away: '海盜揪硬', home: '人生揪難' },
        { id: 'g65', date: '8/28', away: '海盜揪硬', home: '逃生入口A' },
        { id: 'g66', date: '8/29', away: '逃生入口C', home: '酒空組' },
        { id: 'g67', date: '8/30', away: 'VIVI朝酒晚舞', home: 'Jack' },
        { id: 'g68', date: '8/31', away: '一鏢開天門', home: '人生揪難' },
        { id: 'g69', date: '9/1', away: '逃生入口A', home: 'Jack' },
        { id: 'g70', date: '9/1', away: '人生揪難', home: '酒空組' },
        
        // 已經開始的比賽（g01-g10）
        { id: 'g01', date: '2025/4/8', away: '逃生入口A', home: 'VIVI朝酒晚舞' },
        { id: 'g02', date: '2025/4/8', away: '酒空組', home: 'Jack' },
        { id: 'g03', date: '2025/4/8', away: '一鏢開天門', home: '逃生入口C' },
        { id: 'g04', date: '2025/4/8', away: '海盜揪硬', home: '人生揪難' },
        { id: 'g05', date: '2025/4/15', away: '海盜揪硬', home: '逃生入口A' },
        { id: 'g06', date: '2025/4/15', away: '逃生入口C', home: '酒空組' },
        { id: 'g07', date: '2025/4/15', away: 'VIVI朝酒晚舞', home: 'Jack' },
        { id: 'g08', date: '2025/4/15', away: '一鏢開天門', home: '人生揪難' },
        { id: 'g09', date: '2025/4/22', away: '逃生入口A', home: 'Jack' },
        { id: 'g10', date: '2025/4/22', away: '人生揪難', home: '酒空組' },
    ];
    
    // targetDates 現在已經是字串陣列格式 ["8/26", "8/27", ...]
    const targetDateStrings = targetDates;
    
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