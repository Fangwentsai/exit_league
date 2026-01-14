/**
 * Google Apps Script - 完整的保存和上傳功能
 * 
 * 功能：
 * 1. 接收前端發送的比賽資料和 HTML 內容
 * 2. 將 HTML 內容保存到 Google Sheets
 * 3. 自動上傳 HTML 文件到 GitHub
 * 
 * 使用說明：
 * 1. 將此代碼複製到 Google Apps Script 編輯器中
 * 2. 設置 Script Properties（見下方說明）
 * 3. 部署為 Web App
 */

/**
 * 處理 POST 請求（主要入口點）
 * @param {Object} e - 請求事件對象
 * @returns {TextOutput} JSON 格式的回應
 */
function doPost(e) {
  let result;
  
  try {
    // 解析請求資料
    const data = JSON.parse(e.postData.contents);
    
    // 檢查是否為 GitHub 上傳請求
    if (data.action === 'uploadToGitHub') {
      return handleGitHubUploadRequest(data);
    }
    
    // 檢查是否為 GitHub 刪除請求
    if (data.action === 'deleteFromGitHub') {
      return handleGitHubDeleteRequest(data);
    }
    
    // ===== Google Sheets 保存邏輯 =====
    
    // 取得試算表 ID
    const spreadsheetId = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE';
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // 生成時間戳記
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const gameCode = data.gameId;
    
    // 1. 建立 HTML 工作表
    // 使用簡單的命名：{gameCode}.html（例如：g89.html）
    const htmlSheetName = data.htmlSheetName || `${gameCode}.html`;
    let htmlSheet;
    
    try {
      htmlSheet = spreadsheet.getSheetByName(htmlSheetName);
      if (htmlSheet) {
        // 如果工作表已存在，刪除舊的
        spreadsheet.deleteSheet(htmlSheet);
        Logger.log('🗑️ 刪除已存在的工作表: ' + htmlSheetName);
      }
    } catch (error) {
      // 工作表不存在，繼續建立
    }
    
    htmlSheet = spreadsheet.insertSheet(htmlSheetName);
    Logger.log('✅ 已建立新工作表: ' + htmlSheetName);
    
    // ===== 寫入 HTML 內容到 Google Sheets =====
    // 前端已經生成完整的 HTML 文件，格式與 g89.html 完全一致
    
    const htmlContent = data.htmlContent;
    if (!htmlContent) {
      throw new Error('HTML 內容為空，無法保存到 Google Sheets');
    }
    
    Logger.log('📝 開始將 HTML 內容寫入 Google Sheets...');
    Logger.log('📄 HTML 工作表名稱: ' + htmlSheetName);
    Logger.log('📏 HTML 內容長度: ' + htmlContent.length + ' 字元');
    
    // 將 HTML 內容按行分割
    const htmlLines = htmlContent.split('\n');
    Logger.log('📊 HTML 總行數: ' + htmlLines.length);
    
    // 將 HTML 內容寫入 A 欄，每行一個儲存格
    // 這樣可以保持 HTML 文件的完整格式，方便後續查看和使用
    for (let i = 0; i < htmlLines.length; i++) {
      htmlSheet.getRange(i + 1, 1).setValue(htmlLines[i]);
    }
    
    // 設定欄寬（讓 HTML 內容完整顯示）
    htmlSheet.setColumnWidth(1, 500);
    
    Logger.log('✅ HTML 內容已成功寫入 Google Sheets');
    Logger.log('📋 工作表: ' + htmlSheetName);
    Logger.log('📝 總行數: ' + htmlLines.length);
    
    // 2. 選手統計工作表（可選，如果不需要可以註解掉）
    // 注意：前端發送的 playerStats 是空的，所以這部分可能不會執行
    let statsSheetName = null;
    if (data.playerStats && (data.playerStats.away?.length > 0 || data.playerStats.home?.length > 0)) {
      statsSheetName = `stats_${gameCode}_${timestamp}`;
      let statsSheet;
      
      try {
        statsSheet = spreadsheet.getSheetByName(statsSheetName);
        if (statsSheet) {
          spreadsheet.deleteSheet(statsSheet);
        }
      } catch (error) {
        // 工作表不存在，繼續建立
      }
      
      statsSheet = spreadsheet.insertSheet(statsSheetName);
      
      // 寫入選手統計資料
      const playerStats = data.playerStats;
      const awayTeamName = data.awayTeam || '客場隊伍';
      const homeTeamName = data.homeTeam || '主場隊伍';
      
      // 寫入標題行
      const headers = ['選手', '01出賽', '01勝場', 'CR出賽', 'CR勝場', '合計出賽', '合計勝場', '先攻數'];
      statsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // 寫入客場選手統計
      let currentRow = 2;
      statsSheet.getRange(currentRow, 1).setValue(awayTeamName);
      currentRow++;
      
      if (playerStats.away && playerStats.away.length > 0) {
        playerStats.away.forEach(player => {
          statsSheet.getRange(currentRow, 1, 1, 8).setValues([[
            player.name,
            player.o1Games,
            player.o1Wins,
            player.crGames,
            player.crWins,
            player.totalGames,
            player.totalWins,
            player.firstAttacks
          ]]);
          currentRow++;
        });
      } else {
        statsSheet.getRange(currentRow, 1).setValue('無選手資料');
        currentRow++;
      }
      
      // 寫入主場選手統計
      currentRow++;
      statsSheet.getRange(currentRow, 1).setValue(homeTeamName);
      currentRow++;
      
      if (playerStats.home && playerStats.home.length > 0) {
        playerStats.home.forEach(player => {
          statsSheet.getRange(currentRow, 1, 1, 8).setValues([[
            player.name,
            player.o1Games,
            player.o1Wins,
            player.crGames,
            player.crWins,
            player.totalGames,
            player.totalWins,
            player.firstAttacks
          ]]);
          currentRow++;
        });
      } else {
        statsSheet.getRange(currentRow, 1).setValue('無選手資料');
        currentRow++;
      }
      
      // 設定欄寬
      statsSheet.autoResizeColumns(1, 8);
    }
    
    // ===== 自動上傳到 GitHub =====
    // 上傳的 HTML 文件格式與 g89.html 完全一致
    // 文件路徑：game_result/{season}/{gameCode}.html
    // 例如：game_result/season6/g89.html
    let githubResult = null;
    if (data.htmlContent && data.gameId) {
      try {
        const season = getSeasonFromGameId(data.gameId) || 'season6';
        const filePath = `game_result/${season}/${gameCode.toLowerCase()}.html`;
        const commitMessage = `Add ${gameCode.toUpperCase()} game result - ${data.awayTeam || ''} vs ${data.homeTeam || ''}`;
        
        Logger.log('🚀 開始上傳到 GitHub...');
        Logger.log('📁 文件路徑: ' + filePath);
        Logger.log('📝 提交訊息: ' + commitMessage);
        
        // 上傳完整的 HTML 文件到 GitHub
        githubResult = uploadFileToGitHub(filePath, data.htmlContent, commitMessage);
        
        if (githubResult.status === 'success') {
          Logger.log('✅ GitHub 上傳成功: ' + filePath);
          Logger.log('📄 文件 URL: ' + githubResult.fileUrl);
        } else {
          Logger.log('⚠️ GitHub 上傳失敗: ' + githubResult.message);
        }
      } catch (githubError) {
        Logger.log('❌ GitHub 上傳時發生錯誤: ' + githubError.toString());
        // GitHub 上傳失敗不影響主流程
        githubResult = {
          status: 'error',
          message: githubError.toString()
        };
      }
    }
    
    // 設定成功結果
    result = {
      status: 'success',
      gameId: data.gameId,
      htmlSheetName: htmlSheetName,
      htmlSheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${htmlSheet.getSheetId()}`,
      statsSheetName: statsSheetName,
      timestamp: new Date().toISOString(),
      githubUpload: githubResult,
      message: `HTML 文件已成功保存到 Google Sheets（工作表：${htmlSheetName}）`
    };
    
    Logger.log('✅ 處理完成');
    Logger.log('📊 結果: ' + JSON.stringify(result));
      
  } catch (error) {
    Logger.log('❌ 錯誤：' + error.toString());
    Logger.log('📈 錯誤堆疊：' + error.stack);
    
    // 設定錯誤結果
    result = {
      status: 'error',
      message: error.toString()
    };
  }
  
  // 回傳結果
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 GitHub 上傳請求（獨立的上傳功能）
 * @param {Object} data - 請求數據
 * @returns {TextOutput} JSON 格式的回應
 */
function handleGitHubUploadRequest(data) {
  try {
    const result = uploadFileToGitHub(
      data.filePath,
      data.content,
      data.commitMessage
    );
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 GitHub 刪除請求
 * @param {Object} data - 請求數據
 * @returns {TextOutput} JSON 格式的回應
 */
function handleGitHubDeleteRequest(data) {
  try {
    const result = deleteFileFromGitHub(
      data.filePath,
      data.commitMessage
    );
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 上傳文件到 GitHub
 * 使用 GitHub REST API 的 Contents API
 * 
 * @param {string} filePath - 文件路徑（相對於 repository root）
 * @param {string} content - 文件內容（UTF-8 字符串）
 * @param {string} commitMessage - 提交訊息
 * @returns {Object} 上傳結果
 */
function uploadFileToGitHub(filePath, content, commitMessage) {
  try {
    // 從 Script Properties 獲取配置
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('GITHUB_TOKEN');
    const repoOwner = properties.getProperty('GITHUB_REPO_OWNER');
    const repoName = properties.getProperty('GITHUB_REPO_NAME');
    const branch = properties.getProperty('GITHUB_BRANCH') || 'main';
    
    // 驗證配置
    if (!token) {
      throw new Error('GITHUB_TOKEN 未設置，請在 Script Properties 中設置');
    }
    if (!repoOwner) {
      throw new Error('GITHUB_REPO_OWNER 未設置，請在 Script Properties 中設置');
    }
    if (!repoName) {
      throw new Error('GITHUB_REPO_NAME 未設置，請在 Script Properties 中設置');
    }
    
    Logger.log('🚀 開始上傳文件到 GitHub...');
    Logger.log('📁 文件路徑: ' + filePath);
    Logger.log('📝 提交訊息: ' + commitMessage);
    Logger.log('👤 Repository: ' + repoOwner + '/' + repoName);
    Logger.log('🌿 分支: ' + branch);
    
    // 構建 GitHub API URL
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    
    // 將內容轉換為 base64
    // 注意：Google Apps Script 的 base64Encode 需要處理 UTF-8 編碼
    const contentBytes = Utilities.newBlob(content).getBytes();
    const contentBase64 = Utilities.base64Encode(contentBytes);
    
    // 檢查文件是否存在，獲取 SHA（如果存在）
    let sha = null;
    try {
      const checkUrl = `${apiUrl}?ref=${branch}`;
      const checkResponse = UrlFetchApp.fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Google-Apps-Script'
        },
        muteHttpExceptions: true
      });
      
      const checkCode = checkResponse.getResponseCode();
      if (checkCode === 200) {
        const existingFile = JSON.parse(checkResponse.getContentText());
        sha = existingFile.sha;
        Logger.log('📄 文件已存在，將更新: ' + sha);
      } else if (checkCode === 404) {
        Logger.log('📄 文件不存在，將創建新文件');
      } else {
        Logger.log('⚠️ 檢查文件時發生錯誤: ' + checkCode);
      }
    } catch (checkError) {
      Logger.log('⚠️ 檢查文件時發生錯誤: ' + checkError.toString());
      // 繼續執行，假設文件不存在
    }
    
    // 準備請求數據
    const requestData = {
      message: commitMessage,
      content: contentBase64,
      branch: branch
    };
    
    // 如果文件存在，添加 SHA 以更新文件
    if (sha) {
      requestData.sha = sha;
    }
    
    // 發送 PUT 請求上傳文件
    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Google-Apps-Script'
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('📊 GitHub API 回應狀態: ' + responseCode);
    
    if (responseCode === 200 || responseCode === 201) {
      const result = JSON.parse(responseText);
      Logger.log('✅ 文件上傳成功');
      Logger.log('📄 文件 URL: ' + result.content.html_url);
      Logger.log('📝 Commit URL: ' + result.commit.html_url);
      
      return {
        status: 'success',
        fileUrl: result.content.html_url,
        commitUrl: result.commit.html_url,
        filePath: filePath,
        sha: result.content.sha
      };
    } else {
      // 解析錯誤訊息
      let errorMessage = `GitHub API 錯誤: ${responseCode}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage += ' - ' + errorData.message;
        }
      } catch (e) {
        errorMessage += ' - ' + responseText.substring(0, 200);
      }
      
      Logger.log('❌ ' + errorMessage);
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    Logger.log('❌ 上傳到 GitHub 失敗: ' + error.toString());
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * 刪除 GitHub 上的文件
 * 使用 GitHub REST API 的 Contents API
 * 
 * @param {string} filePath - 文件路徑（相對於 repository root）
 * @param {string} commitMessage - 提交訊息
 * @returns {Object} 刪除結果
 */
function deleteFileFromGitHub(filePath, commitMessage) {
  try {
    // 從 Script Properties 獲取配置
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('GITHUB_TOKEN');
    const repoOwner = properties.getProperty('GITHUB_REPO_OWNER');
    const repoName = properties.getProperty('GITHUB_REPO_NAME');
    const branch = properties.getProperty('GITHUB_BRANCH') || 'main';
    
    // 驗證配置
    if (!token) {
      throw new Error('GITHUB_TOKEN 未設置，請在 Script Properties 中設置');
    }
    if (!repoOwner) {
      throw new Error('GITHUB_REPO_OWNER 未設置，請在 Script Properties 中設置');
    }
    if (!repoName) {
      throw new Error('GITHUB_REPO_NAME 未設置，請在 Script Properties 中設置');
    }
    
    Logger.log('🗑️ 開始刪除文件從 GitHub...');
    Logger.log('📁 文件路徑: ' + filePath);
    Logger.log('📝 提交訊息: ' + commitMessage);
    Logger.log('👤 Repository: ' + repoOwner + '/' + repoName);
    Logger.log('🌿 分支: ' + branch);
    
    // 構建 GitHub API URL
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    
    // 先獲取文件的 SHA（必須）
    let sha = null;
    try {
      const checkUrl = `${apiUrl}?ref=${branch}`;
      const checkResponse = UrlFetchApp.fetch(checkUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Google-Apps-Script'
        },
        muteHttpExceptions: true
      });
      
      const checkCode = checkResponse.getResponseCode();
      if (checkCode === 200) {
        const existingFile = JSON.parse(checkResponse.getContentText());
        sha = existingFile.sha;
        Logger.log('📄 找到文件，SHA: ' + sha);
      } else if (checkCode === 404) {
        Logger.log('⚠️ 文件不存在，無需刪除');
        return {
          status: 'success',
          message: '文件不存在，無需刪除',
          filePath: filePath
        };
      } else {
        const errorText = checkResponse.getContentText();
        throw new Error(`檢查文件時發生錯誤: ${checkCode} - ${errorText}`);
      }
    } catch (checkError) {
      Logger.log('❌ 檢查文件時發生錯誤: ' + checkError.toString());
      throw checkError;
    }
    
    if (!sha) {
      throw new Error('無法獲取文件 SHA，無法刪除');
    }
    
    // 準備刪除請求數據
    const requestData = {
      message: commitMessage || `Delete ${filePath}`,
      sha: sha,
      branch: branch
    };
    
    // 發送 DELETE 請求刪除文件
    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Google-Apps-Script'
      },
      payload: JSON.stringify(requestData),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('📊 GitHub API 回應狀態: ' + responseCode);
    
    if (responseCode === 200) {
      const result = JSON.parse(responseText);
      Logger.log('✅ 文件刪除成功');
      Logger.log('📝 Commit URL: ' + result.commit.html_url);
      
      return {
        status: 'success',
        commitUrl: result.commit.html_url,
        filePath: filePath,
        message: '文件刪除成功'
      };
    } else {
      // 解析錯誤訊息
      let errorMessage = `GitHub API 錯誤: ${responseCode}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage += ' - ' + errorData.message;
        }
      } catch (e) {
        errorMessage += ' - ' + responseText.substring(0, 200);
      }
      
      Logger.log('❌ ' + errorMessage);
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    Logger.log('❌ 刪除文件失敗: ' + error.toString());
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * 根據比賽 ID 判斷賽季
 * 可以根據實際需求調整邏輯
 * 
 * @param {string} gameId - 比賽 ID（如 g01, g89）
 * @returns {string} 賽季名稱（如 season5, season6）
 */
function getSeasonFromGameId(gameId) {
  // 預設返回 season6
  // 你可以根據實際需求修改這個邏輯
  
  // 範例：根據比賽編號判斷
  // const gameNum = parseInt(gameId.replace(/\D/g, ''));
  // if (gameNum >= 1 && gameNum <= 56) {
  //   return 'season5';
  // } else if (gameNum >= 57) {
  //   return 'season6';
  // }
  
  return 'season6';
}

/**
 * 處理 GET 請求（用於測試服務是否正常運行）
 * @param {Object} e - 請求事件對象
 * @returns {TextOutput} 文字回應
 */
function doGet(e) {
  return ContentService
    .createTextOutput('Google Apps Script 服務正常運行\n\n' +
                     '功能：\n' +
                     '1. 接收前端 POST 請求\n' +
                     '2. 保存 HTML 到 Google Sheets\n' +
                     '3. 自動上傳到 GitHub')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 測試函數：測試 GitHub 上傳功能
 * 在 Google Apps Script 編輯器中執行此函數即可測試
 */
function testGitHubUpload() {
  const testContent = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test File</h1></body></html>';
  const testPath = 'game_result/season6/test.html';
  const testMessage = 'Test upload from Google Apps Script';
  
  Logger.log('🧪 開始測試 GitHub 上傳功能...');
  
  const result = uploadFileToGitHub(testPath, testContent, testMessage);
  Logger.log('📊 測試結果: ' + JSON.stringify(result));
  
  return result;
}

/**
 * 測試函數：檢查 Script Properties 是否已設置
 */
function checkScriptProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  Logger.log('📋 檢查 Script Properties...');
  Logger.log('GITHUB_TOKEN: ' + (properties.getProperty('GITHUB_TOKEN') ? '✅ 已設置' : '❌ 未設置'));
  Logger.log('GITHUB_REPO_OWNER: ' + (properties.getProperty('GITHUB_REPO_OWNER') || '❌ 未設置'));
  Logger.log('GITHUB_REPO_NAME: ' + (properties.getProperty('GITHUB_REPO_NAME') || '❌ 未設置'));
  Logger.log('GITHUB_BRANCH: ' + (properties.getProperty('GITHUB_BRANCH') || 'main (預設)'));
  
  return {
    token: properties.getProperty('GITHUB_TOKEN') ? '已設置' : '未設置',
    repoOwner: properties.getProperty('GITHUB_REPO_OWNER') || '未設置',
    repoName: properties.getProperty('GITHUB_REPO_NAME') || '未設置',
    branch: properties.getProperty('GITHUB_BRANCH') || 'main'
  };
}

/*
================================================================================
部署和使用說明
================================================================================

## 📋 步驟 1：複製代碼到 Google Apps Script

1. 前往 [Google Apps Script](https://script.google.com/)
2. 點擊「新增專案」
3. 將此文件的全部內容複製到編輯器中
4. 點擊「儲存」（Ctrl+S 或 Cmd+S）

## 📋 步驟 2：設置 Script Properties（重要！）

1. 在 Google Apps Script 編輯器中，點擊左側的「專案設定」（Project Settings）
2. 滾動到「指令碼屬性」（Script Properties）
3. 點擊「新增指令碼屬性」，逐一添加：

| 屬性名稱 | 屬性值 | 說明 |
|---------|--------|------|
| `GITHUB_TOKEN` | `ghp_...` | GitHub Personal Access Token |
| `GITHUB_REPO_OWNER` | `Fangwentsai` | GitHub 用戶名 |
| `GITHUB_REPO_NAME` | `exit_league` | Repository 名稱 |
| `GITHUB_BRANCH` | `main` | 分支名稱 |

4. 如何獲取 GitHub Token：
   - 前往 [GitHub Settings → Tokens](https://github.com/settings/tokens)
   - 點擊「Generate new token (classic)」
   - 設置權限：✅ `repo`（完整權限）
   - 生成並複製 Token

## 📋 步驟 3：部署為 Web App

1. 點擊右上角的「部署」→「新增部署作業」
2. 選擇類型：「網頁應用程式」
3. 設置：
   - **執行身份**：選擇「我」
   - **具有存取權的使用者**：選擇「所有人」
4. 點擊「部署」
5. **重要**：複製「網頁應用程式 URL」，這就是你的 Web App URL

## 📋 步驟 4：測試

### 方法 1：使用測試函數
1. 在編輯器中選擇 `testGitHubUpload` 函數
2. 點擊「執行」（Run）
3. 查看執行記錄（View → Logs）

### 方法 2：使用前端測試頁面
1. 打開 `github_autoupdate/test-upload-to-season6.html`
2. 載入配置並執行測試

## ⚠️ 注意事項

1. **首次部署後需要授權**
   - 第一次執行時，Google 會要求授權
   - 點擊「檢閱權限」→ 選擇你的 Google 帳號 → 「進階」→ 「前往 [專案名稱]（不安全）」

2. **更新代碼後需要重新部署**
   - 每次修改代碼後，需要點擊「部署」→「管理部署作業」→「編輯」→「新版本」→「部署」

3. **Script Properties 是安全的**
   - Token 不會暴露給前端
   - 只有 Google Apps Script 可以讀取

4. **試算表 ID**
   - 預設試算表 ID：`1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE`
   - 如果需要修改，請修改第 25 行的 `spreadsheetId`

## 📚 相關文件

- `github_autoupdate/SETUP_GAS.md` - 詳細設置指南
- `github_autoupdate/GAS_GITHUB_SETUP.md` - GitHub API 設置說明
- `github_autoupdate/README.md` - 配置說明

================================================================================
*/
