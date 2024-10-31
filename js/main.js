document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.nav-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按鈕的 active 狀態
            buttons.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline-primary');
            });
            
            // 設定當前按鈕的 active 狀態
            btn.classList.add('active');
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
            
            // 更新 iframe 內容
            const page = btn.dataset.page;
            document.getElementById('contentFrame').src = `pages/${page}.html`;
        });
    });
});

