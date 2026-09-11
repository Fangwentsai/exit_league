// 選手姓名超連結共用邏輯。
// 給沒有載入 main.js 的獨立頁面（news.html、rank 排行榜獨立頁）共用，
// 讓排行榜姓名可以點擊，跳到 pages/player.html 顯示該選手的跨屆生涯成績。
//
// 行為規則：
//   - 如果目前頁面「還沒」被包在 iframe 彈窗裡（例如首頁、news.html、
//     排行榜頁本身直接被瀏覽器打開），點擊姓名時用 showMatchDetails()
//     開一個 iframe 彈窗顯示 player.html（跟點擊比賽詳情一樣的體驗）。
//   - 如果目前頁面「已經」在 iframe 彈窗裡了，就不要再疊一層 iframe，
//     直接在原地跳轉到 player.html，讓使用者可以用瀏覽器上一頁／手勢滑動
//     回到原本的內容。
function openPlayerPage(name, team) {
    if (!name) return;
    const inIframe = (window.self !== window.top);
    const path = window.location.pathname;
    const isInPagesDir = path.indexOf('/pages/') !== -1;
    const isInGameResultDir = path.indexOf('/game_result/') !== -1;
    const base = isInGameResultDir ? '../../pages/' : (isInPagesDir ? '' : 'pages/');
    const url = `${base}player.html?name=${encodeURIComponent(name)}&team=${encodeURIComponent(team || '')}`;

    if (!inIframe && typeof showMatchDetails === 'function') {
        showMatchDetails(url);
    } else {
        window.location.href = url;
    }
}

function playerLinkHtml(name, team) {
    if (!name) return '';
    const safeName = String(name).replace(/'/g, "\\'");
    const safeTeam = String(team || '').replace(/'/g, "\\'");
    return `<span class="player-link" onclick="openPlayerPage('${safeName}', '${safeTeam}')">${name}</span>`;
}

// 有些頁面（例如 news.html）已經自己定義過 showMatchDetails，那份定義比較
// 完整就保留它；這裡只在頁面完全沒有這個函式時，補一份給獨立的排行榜頁用。
if (typeof window.showMatchDetails !== 'function') {
    window.showMatchDetails = function (gameUrl) {
        const existingModal = document.getElementById('matchDetailOverlay');
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = 'matchDetailOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10002;display:flex;justify-content:center;align-items:center;padding:10px;opacity:0;visibility:hidden;transition:opacity 0.3s ease,visibility 0.3s ease;';

        const card = document.createElement('div');
        card.id = 'matchDetailCard';
        card.style.cssText = 'position:relative;width:90%;max-width:500px;height:85vh;background:#fff;border-radius:8px;box-shadow:0 0 20px rgba(0,0,0,0.3);overflow:visible;display:flex;flex-direction:column;';

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
        });

        function close() {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            document.body.style.overflow = '';
            setTimeout(() => overlay.remove(), 300);
            document.removeEventListener('keydown', onEsc);
        }

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.addEventListener('touchmove', (e) => {
            e.stopPropagation();
            if (!e.target.closest || !e.target.closest('#matchDetailScrollWrap')) e.preventDefault();
        }, { passive: false });

        function onEsc(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onEsc);

        const closeBtn = document.createElement('button');
        closeBtn.id = 'matchDetailCloseBtn';
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position:absolute;top:-12px;right:-12px;width:30px;height:30px;font-size:20px;display:flex;justify-content:center;align-items:center;background:#f44336;color:#fff;border:none;border-radius:50%;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.3);z-index:10005;';
        closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); close(); });
        card.appendChild(closeBtn);

        const scrollWrap = document.createElement('div');
        scrollWrap.id = 'matchDetailScrollWrap';
        scrollWrap.style.cssText = 'position:relative;width:100%;height:100%;overflow-y:scroll;-webkit-overflow-scrolling:touch;border-radius:8px;background-color:#f5f5f5;';

        const iframe = document.createElement('iframe');
        iframe.src = gameUrl;
        iframe.style.cssText = 'width:100%;border:none;display:block;min-height:100%;';
        iframe.scrolling = 'no';
        iframe.onload = function () {
            try {
                const doc = iframe.contentWindow.document;
                const updateHeight = () => {
                    const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, doc.body.offsetHeight);
                    iframe.style.height = h + 20 + 'px';
                };
                updateHeight();
                if (iframe.contentWindow.ResizeObserver) {
                    new iframe.contentWindow.ResizeObserver(updateHeight).observe(doc.body);
                } else {
                    setInterval(updateHeight, 500);
                }
            } catch (e) {
                iframe.scrolling = 'yes';
            }
        };

        scrollWrap.appendChild(iframe);
        card.appendChild(scrollWrap);
    };
}
