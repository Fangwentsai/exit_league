/**
 * 刪除 GitHub 檔案的腳本
 * 使用方式：node delete-files-script.js
 */

const fs = require('fs');
const path = require('path');

// 讀取配置
const configPath = path.join(__dirname, 'config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('❌ 無法讀取 config.json:', error.message);
    process.exit(1);
}

const { token, repoOwner, repoName, branch } = config.github;

if (!token || !repoOwner || !repoName) {
    console.error('❌ 配置不完整，請檢查 config.json');
    process.exit(1);
}

// 要刪除的檔案列表
const filesToDelete = [
    'game_result/season6/g01.html',
    'game_result/season6/text.html',
    'GAS_SETUP_GUIDE.md',
    'GITHUB_SETUP.md',
    'test-admin-save.html',
    'google-apps-script-test.js'
];

/**
 * 刪除 GitHub 檔案
 */
async function deleteFile(filePath) {
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    
    try {
        // 1. 先獲取檔案 SHA
        console.log(`📋 檢查檔案: ${filePath}`);
        const checkResponse = await fetch(`${apiUrl}?ref=${branch}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Exit-League-Delete-Script'
            }
        });

        if (checkResponse.status === 404) {
            console.log(`⚠️  檔案不存在: ${filePath}`);
            return { success: true, skipped: true };
        }

        if (!checkResponse.ok) {
            const errorText = await checkResponse.text();
            throw new Error(`檢查檔案失敗: ${checkResponse.status} - ${errorText}`);
        }

        const fileInfo = await checkResponse.json();
        const sha = fileInfo.sha;
        console.log(`📄 找到檔案，SHA: ${sha.substring(0, 8)}...`);

        // 2. 刪除檔案
        console.log(`🗑️  刪除檔案: ${filePath}`);
        const deleteResponse = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Exit-League-Delete-Script'
            },
            body: JSON.stringify({
                message: `Delete ${filePath}`,
                sha: sha,
                branch: branch
            })
        });

        if (deleteResponse.ok) {
            const result = await deleteResponse.json();
            console.log(`✅ 刪除成功: ${filePath}`);
            console.log(`   Commit: ${result.commit.html_url}`);
            return { success: true, commitUrl: result.commit.html_url };
        } else {
            const errorText = await deleteResponse.text();
            throw new Error(`刪除失敗: ${deleteResponse.status} - ${errorText}`);
        }

    } catch (error) {
        console.error(`❌ 刪除失敗: ${filePath}`);
        console.error(`   錯誤: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 主函數
 */
async function main() {
    console.log('🚀 開始刪除 GitHub 檔案...\n');
    console.log(`📦 Repository: ${repoOwner}/${repoName}`);
    console.log(`🌿 Branch: ${branch || 'main'}\n`);

    const results = [];
    for (const filePath of filesToDelete) {
        const result = await deleteFile(filePath);
        results.push({ filePath, ...result });
        
        // 稍微延遲，避免 API 限制
        if (filesToDelete.indexOf(filePath) < filesToDelete.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // 總結
    console.log('\n---\n📊 刪除結果總結:');
    const successCount = results.filter(r => r.success).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failCount = results.filter(r => !r.success && !r.skipped).length;

    results.forEach(({ filePath, success, skipped, error, commitUrl }) => {
        if (skipped) {
            console.log(`  ⚠️  ${filePath} - 已跳過（檔案不存在）`);
        } else if (success) {
            console.log(`  ✅ ${filePath} - 成功`);
        } else {
            console.log(`  ❌ ${filePath} - 失敗: ${error}`);
        }
    });

    console.log(`\n✅ 成功: ${successCount} 個`);
    if (skippedCount > 0) {
        console.log(`⚠️  跳過: ${skippedCount} 個`);
    }
    if (failCount > 0) {
        console.log(`❌ 失敗: ${failCount} 個`);
    }
}

// 執行
main().catch(error => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
});
