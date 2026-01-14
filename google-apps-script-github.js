/**
 * Google Apps Script - GitHub 上傳功能
 * 
 * 使用說明：
 * 1. 將此代碼複製到你的 Google Apps Script 專案中
 * 2. 在「專案設定」→「指令碼屬性」中設置以下屬性：
 *    - GITHUB_TOKEN: 你的 GitHub Personal Access Token
 *    - GITHUB_REPO_OWNER: 你的 GitHub 用戶名或組織名
 *    - GITHUB_REPO_NAME: Repository 名稱（例如：exit_league）
 *    - GITHUB_BRANCH: 分支名稱（預設：main）
 * 3. 部署為 Web App，並設置執行身份和存取權限
 */

/**
 * 處理 POST 請求（主要入口點）
 */
function doPost(e) {
  try {
    // 解析請求數據
    const data = JSON.parse(e.postData.contents);
    
    // 檢查是否為 GitHub 上傳請求
    if (data.action === 'uploadToGitHub') {
      return handleGitHubUploadRequest(data);
    }
    
    // 原有的 Google Sheets 保存邏輯
    const result = saveToGoogleSheets(data);
    
    // 如果保存成功且有 HTML 內容，自動上傳到 GitHub
    if (result.status === 'success' && data.htmlContent && data.gameId) {
      // 異步上傳到 GitHub（不阻塞主流程）
      try {
        const gameCode = data.gameId.toLowerCase();
        const season = getSeasonFromGameId(data.gameId) || 'season6';
        const filePath = `game_result/${season}/${gameCode}.html`;
        const commitMessage = `Add ${gameCode.toUpperCase()} game result - ${data.awayTeam || ''} vs ${data.homeTeam || ''}`;
        
        const githubResult = uploadFileToGitHub(filePath, data.htmlContent, commitMessage);
        
        if (githubResult.status === 'success') {
          result.githubUpload = {
            success: true,
            filePath: filePath,
            fileUrl: githubResult.fileUrl,
            commitUrl: githubResult.commitUrl
          };
        } else {
          result.githubUpload = {
            success: false,
            error: githubResult.message
          };
        }
      } catch (githubError) {
        // GitHub 上傳失敗不影響主流程
        result.githubUpload = {
          success: false,
          error: githubError.toString()
        };
      }
    }
    
    // 返回 JSON 回應
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('錯誤: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 GitHub 上傳請求
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
 * 上傳文件到 GitHub
 * @param {string} filePath - 文件路徑（相對於 repository root）
 * @param {string} content - 文件內容
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
 * 根據比賽 ID 判斷賽季
 * 可以根據實際需求調整邏輯
 * @param {string} gameId - 比賽 ID（如 g01, g89）
 * @returns {string} 賽季名稱（如 season5, season6）
 */
function getSeasonFromGameId(gameId) {
  // 這裡可以根據實際需求調整邏輯
  // 例如：
  // - 根據比賽編號範圍判斷
  // - 從 Google Sheets 讀取賽季資訊
  // - 從請求數據中獲取
  
  // 預設返回 season6，你可以根據實際情況修改
  return 'season6';
  
  // 範例：根據比賽編號判斷
  // const gameNum = parseInt(gameId.replace(/\D/g, ''));
  // if (gameNum >= 1 && gameNum <= 56) {
  //   return 'season5';
  // } else if (gameNum >= 57) {
  //   return 'season6';
  // }
  // return 'season6';
}

/**
 * 原有的 Google Sheets 保存函數
 * 請保持你現有的實現
 */
function saveToGoogleSheets(data) {
  try {
    // ===== 這裡是你現有的 Google Sheets 保存邏輯 =====
    // 請保持你現有的代碼不變
    
    // 範例代碼（請替換為你的實際實現）：
    const SPREADSHEET_ID = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 你的保存邏輯...
    
    return {
      status: 'success',
      gameId: data.gameId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('保存到 Google Sheets 失敗: ' + error.toString());
    return {
      status: 'error',
      message: error.toString()
    };
  }
}

/**
 * 測試函數（可選，用於測試 GitHub 上傳功能）
 */
function testGitHubUpload() {
  const testContent = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test File</h1></body></html>';
  const testPath = 'game_result/season6/test.html';
  const testMessage = 'Test upload from Google Apps Script';
  
  const result = uploadFileToGitHub(testPath, testContent, testMessage);
  Logger.log('測試結果: ' + JSON.stringify(result));
  
  return result;
}
