document.addEventListener('DOMContentLoaded', function() {
    // 獲取所有導航按鈕
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // 為每個按鈕添加點擊事件
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 特殊處理賽程和排名按鈕
            if (this.id === 'scheduleBtn' || this.id === 'rankBtn') {
                // 只顯示下拉選單，不跳轉頁面
                return;
            }
            
            // 其他按鈕的正常處理...
            const page = this.getAttribute('data-page');
            document.getElementById('contentFrame').src = `pages/${page}.html`;
            
            // 更新活動按鈕狀態
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 處理賽程按鈕點擊事件
    const scheduleBtn = document.getElementById('scheduleBtn');
    const scheduleDropdown = document.getElementById('scheduleDropdown');
    
    scheduleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 關閉其他下拉選單
        if (rankDropdown.classList.contains('show')) {
            rankDropdown.classList.remove('show');
            rankBtn.classList.remove('active');
        }
        
        // 切換當前下拉選單
        scheduleDropdown.classList.toggle('show');
        
        // 更新按鈕狀態
        this.classList.toggle('active');
    });
    
    // 處理排名按鈕點擊事件
    const rankBtn = document.getElementById('rankBtn');
    const rankDropdown = document.getElementById('rankDropdown');
    
    rankBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 關閉其他下拉選單
        if (scheduleDropdown.classList.contains('show')) {
            scheduleDropdown.classList.remove('show');
            scheduleBtn.classList.remove('active');
        }
        
        // 切換當前下拉選單
        rankDropdown.classList.toggle('show');
        
        // 更新按鈕狀態
        this.classList.toggle('active');
    });
    
    // 設置下拉選單項目點擊事件 - 賽程
    const scheduleItems = scheduleDropdown.querySelectorAll('.dropdown-item');
    scheduleItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 設置對應的 iframe src
            document.getElementById('contentFrame').src = this.getAttribute('href');
            
            // 關閉下拉選單
            scheduleDropdown.classList.remove('show');
            
            // 更新活動按鈕狀態
            navButtons.forEach(btn => btn.classList.remove('active'));
            scheduleBtn.classList.add('active');
        });
    });
    
    // 設置下拉選單項目點擊事件 - 排名
    const rankItems = rankDropdown.querySelectorAll('.dropdown-item');
    rankItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 設置對應的 iframe src
            document.getElementById('contentFrame').src = this.getAttribute('href');
            
            // 關閉下拉選單
            rankDropdown.classList.remove('show');
            
            // 更新活動按鈕狀態
            navButtons.forEach(btn => btn.classList.remove('active'));
            rankBtn.classList.add('active');
        });
    });
    
    // 點擊頁面其他地方關閉所有下拉選單
    document.addEventListener('click', function() {
        if (scheduleDropdown.classList.contains('show')) {
            scheduleDropdown.classList.remove('show');
        }
        
        if (rankDropdown.classList.contains('show')) {
            rankDropdown.classList.remove('show');
        }
    });
});

