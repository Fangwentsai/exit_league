const { SHEET_ID, API_KEY } = CONFIG;

async function loadRankings() {
    try {
        const range = 'schedule!K:Q';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        const tableBody = document.getElementById('rankTableBody');
        
        // 將數據轉換為對象數組以便排序
        let rankings = data.values.slice(1)
            .map((row, index) => ({
                team: row[0] || '',        // K欄: 隊名
                wins: row[1] || '',        // L欄: 勝
                losses: row[2] || '',      // M欄: 敗
                draws: row[3] || '',       // N欄: 和
                points: row[4] || '',      // O欄: 積分
                bonus: row[5] || '',       // P欄: 飲酒加成
                total: parseFloat(row[6] || 0)  // Q欄: 總分，轉換為數字
            }));

        // 依總分排序（降序）
        rankings.sort((a, b) => b.total - a.total);

        // 清空表格
        tableBody.innerHTML = '';

        // 重新填入排序後的數據
        rankings.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>           <!-- 排名 (1-8) -->
                <td>${row.team}</td>
                <td>${row.wins}</td>
                <td>${row.losses}</td>
                <td>${row.draws}</td>
                <td>${row.points}</td>
                <td>${row.bonus}</td>
                <td>${row.total}</td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error loading rankings:', error);
        document.getElementById('rankTableBody').innerHTML = 
            '<tr><td colspan="8">載入排名時發生錯誤</td></tr>';
    }
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', () => {
    console.log('頁面載入完成，開始執行...');
    loadRankings();
    loadPersonalRankings();
});

// 添加分頁相關變數
let currentPage = 1;
const rowsPerPage = 8;
let allRankings = [];

async function loadPersonalRankings() {
    try {
        console.log('開始載入個人排名...');
        const range = 'personal!A:I';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            throw new Error('No data found in sheet');
        }

        // 將數據轉換為對象數組
        allRankings = data.values.slice(1).map((row, index) => ({
            team: row[0] || '',
            name: row[1] || '',
            wins01: parseFloat(row[2]) || 0,
            rate01: parseFloat(row[3]) || 0,
            winsCR: parseFloat(row[4]) || 0,
            rateCR: parseFloat(row[5]) || 0,
            totalWins: parseFloat(row[6]) || 0,
            totalRate: parseFloat(row[7]) || 0,
            firstRate: parseFloat(row[8]) || 0
        }));

        updatePersonalTable();
        setupSorting();
        setupPagination();

    } catch (error) {
        console.error('載入個人排名時發生錯誤:', error);
        document.getElementById('personalTableBody').innerHTML = 
            '<tr><td colspan="10">載入個人排名時發生錯誤</td></tr>';
    }
}

function updatePersonalTable() {
    const tableBody = document.getElementById('personalTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // 計算當前頁面的數據範圍
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = allRankings.slice(start, end);
    
    pageData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${row.team}</td>
            <td>${row.name}</td>
            <td>${row.wins01}</td>
            <td>${row.rate01}%</td>
            <td>${row.winsCR}</td>
            <td>${row.rateCR}%</td>
            <td>${row.totalWins}</td>
            <td>${row.totalRate}%</td>
            <td>${row.firstRate}%</td>
        `;
        tableBody.appendChild(tr);
    });
}

function setupPagination() {
    const totalPages = Math.ceil(allRankings.length / rowsPerPage);
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    
    // 上一頁按鈕
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一頁';
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            updatePersonalTable();
            updatePaginationButtons();
        }
    };
    
    // 下一頁按鈕
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一頁';
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            updatePersonalTable();
            updatePaginationButtons();
        }
    };
    
    // 頁碼按鈕
    const pageButtons = document.createElement('div');
    pageButtons.className = 'page-buttons';
    
    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageButtons);
    paginationContainer.appendChild(nextButton);
    
    // 將分頁控制項添加到表格後面
    const personalTable = document.getElementById('personalTable');
    personalTable.parentNode.insertBefore(paginationContainer, personalTable.nextSibling);
    
    updatePaginationButtons();
}

function updatePaginationButtons() {
    const totalPages = Math.ceil(allRankings.length / rowsPerPage);
    const pageButtons = document.querySelector('.page-buttons');
    pageButtons.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = i === currentPage ? 'active' : '';
        button.onclick = () => {
            currentPage = i;
            updatePersonalTable();
            updatePaginationButtons();
        };
        pageButtons.appendChild(button);
    }
}

function setupSorting() {
    const headers = document.querySelectorAll('.sortable');
    headers.forEach(header => {
        let isAsc = true;
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            
            // 排序數據
            allRankings.sort((a, b) => {
                const valueA = a[column];
                const valueB = b[column];
                return isAsc ? valueB - valueA : valueA - valueB;
            });

            isAsc = !isAsc;
            currentPage = 1; // 重置到第一頁
            updatePersonalTable();
            updatePaginationButtons();
        });
    });
}
 