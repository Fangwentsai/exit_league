/**
 * GitHub API 處理模組
 * 負責將生成的 HTML 文件上傳到 GitHub 指定資料夾
 */

// GitHub API 配置
const GITHUB_CONFIG = {
    // 這些配置應該從環境變數或後端獲取，不應該硬編碼在前端
    // 建議通過 Google Apps Script 或其他後端服務來處理 GitHub API 調用
    REPO_OWNER: '',  // GitHub 用戶名或組織名
    REPO_NAME: '',   // Repository 名稱
    BRANCH: 'main',  // 預設分支
    BASE_PATH: 'game_result/season6',  // 基礎路徑
    // Token 應該通過後端 API 獲取，不應該存儲在前端
};

/**
 * 上傳文件到 GitHub
 * @param {string} filePath - 文件路徑（相對於 repository root）
 * @param {string} content - 文件內容
 * @param {string} commitMessage - 提交訊息
 * @param {string} token - GitHub Personal Access Token（應該從後端獲取）
 * @returns {Promise<Object>} 上傳結果
 */
async function uploadFileToGitHub(filePath, content, commitMessage, token) {
    try {
        console.log('🚀 開始上傳文件到 GitHub...');
        console.log('📁 文件路徑:', filePath);
        console.log('📝 提交訊息:', commitMessage);
        
        if (!GITHUB_CONFIG.REPO_OWNER || !GITHUB_CONFIG.REPO_NAME) {
            throw new Error('GitHub 配置不完整，請設置 REPO_OWNER 和 REPO_NAME');
        }
        
        if (!token) {
            throw new Error('GitHub Token 未提供');
        }
        
        // 將內容轉換為 base64
        const contentBase64 = btoa(unescape(encodeURIComponent(content)));
        
        // GitHub API URL
        const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/${filePath}`;
        
        // 先檢查文件是否存在，獲取 SHA（如果存在）
        let sha = null;
        try {
            const checkResponse = await fetch(`${apiUrl}?ref=${GITHUB_CONFIG.BRANCH}`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (checkResponse.ok) {
                const existingFile = await checkResponse.json();
                sha = existingFile.sha;
                console.log('📄 文件已存在，將更新:', sha);
            }
        } catch (error) {
            console.log('📄 文件不存在，將創建新文件');
        }
        
        // 準備請求數據
        const requestData = {
            message: commitMessage,
            content: contentBase64,
            branch: GITHUB_CONFIG.BRANCH
        };
        
        // 如果文件存在，添加 SHA 以更新文件
        if (sha) {
            requestData.sha = sha;
        }
        
        // 發送 PUT 請求上傳文件
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('📊 GitHub API 回應狀態:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ 文件上傳成功:', result);
            return {
                success: true,
                data: result,
                fileUrl: result.content.html_url,
                commitUrl: result.commit.html_url
            };
        } else {
            const errorText = await response.text();
            console.error('❌ GitHub API 錯誤:', response.status, errorText);
            throw new Error(`GitHub API 錯誤: ${response.status} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ 上傳到 GitHub 失敗:', error);
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
 * 通過 Google Apps Script 上傳到 GitHub（推薦方式）
 * 這樣可以避免在前端暴露 GitHub Token
 * @param {string} filePath - 文件路徑
 * @param {string} content - 文件內容
 * @param {string} commitMessage - 提交訊息
 * @param {string} scriptUrl - Google Apps Script Web App URL
 * @returns {Promise<Object>} 上傳結果
 */
async function uploadFileToGitHubViaScript(filePath, content, commitMessage, scriptUrl) {
    try {
        console.log('🚀 通過 Google Apps Script 上傳文件到 GitHub...');
        console.log('📁 文件路徑:', filePath);
        console.log('📝 提交訊息:', commitMessage);
        
        if (!scriptUrl) {
            throw new Error('Google Apps Script URL 未提供');
        }
        
        const requestData = {
            action: 'uploadToGitHub',
            filePath: filePath,
            content: content,
            commitMessage: commitMessage
        };
        
        const response = await fetch(scriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('📊 伺服器回應狀態:', response.status, response.statusText);
        
        if (response.ok) {
            const resultText = await response.text();
            console.log('📄 伺服器回應內容:', resultText);
            
            try {
                const result = JSON.parse(resultText);
                if (result.status === 'success') {
                    console.log('✅ 文件上傳成功:', result);
                    return {
                        success: true,
                        data: result
                    };
                } else {
                    throw new Error(result.message || '上傳失敗');
                }
            } catch (parseError) {
                console.error('❌ 解析回應失敗:', parseError);
                if (resultText.includes('success') || resultText.includes('成功')) {
                    return {
                        success: true,
                        message: '上傳完成'
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
        console.error('❌ 通過 Script 上傳到 GitHub 失敗:', error);
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
 * 根據比賽代碼確定賽季和路徑
 * @param {string} gameCode - 比賽代碼（如 g01, g89）
 * @param {string} season - 可選的賽季名稱（如 season6），如果不提供則使用預設值
 * @returns {Object} 包含賽季和完整路徑的對象
 */
function getGamePath(gameCode, season = null) {
    // 如果沒有指定賽季，使用配置中的基礎路徑或預設為 season6
    const targetSeason = season || GITHUB_CONFIG.BASE_PATH.split('/').pop() || 'season6';
    const fileName = `${gameCode.toLowerCase()}.html`;
    
    // 如果 BASE_PATH 已設置，使用它；否則構建路徑
    let filePath;
    if (GITHUB_CONFIG.BASE_PATH && GITHUB_CONFIG.BASE_PATH !== 'game_result/season6') {
        filePath = `${GITHUB_CONFIG.BASE_PATH}/${fileName}`;
    } else {
        filePath = `game_result/${targetSeason}/${fileName}`;
    }
    
    return {
        season: targetSeason,
        fileName: fileName,
        filePath: filePath
    };
}

// 匯出函數供其他模組使用
window.GitHubAPI = {
    uploadFileToGitHub,
    uploadFileToGitHubViaScript,
    getGamePath,
    GITHUB_CONFIG
};
