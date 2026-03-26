/**
 * Shopee 商品輪播模組 - game_result 頁面專用
 * 動態從 /api/shopee-products 拉取商品（含 imageUrl）
 * Vercel 環境：顯示真實圖片；localhost：fallback 靜態資料 + SVG 佔位圖
 * Desktop 每頁 4 個 / Mobile 每頁 2 個
 */

(function () {
    'use strict';

    // ========== 主商品清單：以 CSV 為主，名稱/價格/推廣連結固定 ==========
    // shopId: 50984140 (AA darts Shop AsiA 飛鏢專賣店)
    const csvProducts = [
        { id: 868804330,    name: 'Fit Point Plus 50入裝 [2BA]',                         price: 95,  url: 'https://s.shopee.tw/5VQtBWKcVf', image: '' },
        { id: 868833814,    name: 'L-style Premium Lippoint 30入裝 [2BA]',               price: 133, url: 'https://s.shopee.tw/6L00B3HRoq', image: '' },
        { id: 903053372,    name: 'L-SHaft Lock Straight New Color 2020 塑膠/鎖桿(粗)',   price: 133, url: 'https://s.shopee.tw/6VJQNMGoTt', image: '' },
        { id: 25027147618,  name: 'TARGET K-FLEX 素色一體式鏢翼 [Standard]',              price: 247, url: 'https://s.shopee.tw/60N9mRIiUo', image: '' },
        { id: 13393284902,  name: 'Fit Point Plus SHORT 50入裝 [2BA]',                   price: 95,  url: 'https://s.shopee.tw/6AgZykI59r', image: '' },
        { id: 28524447808,  name: '【限定】K-FLEX TARGET JAPAN Logo [Standard]',           price: 247, url: 'https://s.shopee.tw/70FgyHEuT2', image: '' },
        { id: 2514448015,   name: 'L-SHaft Lock Slim New Color 2020 塑膠/鎖桿(細)',       price: 133, url: 'https://s.shopee.tw/7AZ7AaEH85', image: '' },
        { id: 902648309,    name: 'Fit Flight AIR 薄鏢翼 3入裝 素色 [Shape]',             price: 142, url: 'https://s.shopee.tw/6fcqZfGB90', image: '' },
        { id: 905309016,    name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Purple)',              price: 161, url: 'https://s.shopee.tw/6pwGlyFXo3', image: '' },
        { id: 2425955632,   name: 'Fit Shaft Gear Slim 塑膠/細桿 (Yellow)',               price: 161, url: 'https://s.shopee.tw/7fVNlVCN7E', image: '' },
        { id: 2709255132,   name: 'L-Flight EZ Combined 3入裝 素色鏢翼 [Standard]',       price: 171, url: 'https://s.shopee.tw/7ponxoBjmH', image: '' },
        { id: 2425916103,   name: 'Fit Shaft Gear Slim 塑膠/細桿 (Orange)',               price: 161, url: 'https://s.shopee.tw/7KsXMtDdnC', image: '' },
        { id: 26038400230,  name: 'L-Flight EZ Dimple [Standard]',                       price: 171, url: 'https://s.shopee.tw/7VBxZCD0SF', image: '' },
        { id: 41709116553,  name: 'Fit Flight 馬場善久 BURGER MONSTER 選手款 [Standard]',  price: 180, url: 'https://s.shopee.tw/8Kl4Yj9plQ', image: '' },
        { id: 26771946818,  name: 'Fit Flight 川上真奈 ver.4 選手款 [Shape]',              price: 180, url: 'https://s.shopee.tw/8V4Ul29CQT', image: '' },
        { id: 24311767535,  name: 'Fit Flight 厚鏢翼 Japanese Pattern2 [Standard/Shape]', price: 180, url: 'https://s.shopee.tw/808EA7B6RO', image: '' },
        { id: 25267933019,  name: 'Fit Flight 厚鏢翼 The Modern [Standard/Shape]',        price: 180, url: 'https://s.shopee.tw/8AReMQAT6R', image: '' },
        { id: 24481606486,  name: 'Fit Flight 柴崎晋之介 Ver.2 選手款 [Shape]',            price: 189, url: 'https://s.shopee.tw/900lLx7IPc', image: '' },
        { id: 29274463910,  name: 'L-Flight x unicorn PRO 林桃加 ver.1 選手款 [Shape]',   price: 209, url: 'https://s.shopee.tw/9AKBYG6f4f', image: '' },
        { id: 10030669557,  name: 'L-Flight PRO KAMI 坂口優希恵 ver.1 MIX 選手款 [Shape]',price: 209, url: 'https://s.shopee.tw/8fNuxL8Z5a', image: '' },
        { id: 28301605320,  name: 'Fit Flight AIR 柴崎晋之介 Ver.2 選手款 [Shape]',        price: 218, url: 'https://s.shopee.tw/8phL9e7vkd', image: '' },
        { id: 29613894594,  name: 'TARGET K-FLEX NEON 素色一體式鏢翼 [Shape]',            price: 247, url: 'https://s.shopee.tw/9fGS9B4l3o', image: '' },
        { id: 24443888804,  name: '【限定】K-FLEX TARGET JAPAN Logo [Shape]',              price: 247, url: 'https://s.shopee.tw/9pZsLU47ir', image: '' },
        { id: 20195963128,  name: 'TARGET K-FLEX RGB Series 一體式素色鏢翼 [Shape]',       price: 247, url: 'https://s.shopee.tw/9KdbkZ61jm', image: '' },
    ];

    // ========== 向 API 取圖片，merge 回 CSV 商品（名稱/價格/推廣連結不動）==========
    async function fetchProducts() {
        try {
            const itemIds = csvProducts.map(p => p.id).join(',');
            const response = await fetch(`/api/shopee-products?mode=images&itemIds=${itemIds}&shopId=50984140`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.images && data.images.length > 0) {
                const imageMap = {};
                data.images.forEach(item => { imageMap[item.id] = item.image; });
                console.log('✅ Shopee game carousel: 成功取得', data.images.length, '張商品圖');
                return csvProducts.map(p => ({ ...p, image: imageMap[p.id] || '' }));
            }
            throw new Error('no images');
        } catch (err) {
            console.warn('⚠️ Shopee game carousel: 圖片 API 失敗，使用 SVG 佔位圖', err.message);
            return csvProducts;
        }
    }

    // ========== 生成 SVG 佔位圖 ==========
    const COLORS = ['#EE4D2D', '#FF6633', '#FF8844', '#E63919', '#FF5522', '#CC3300'];
    function placeholderImg(text, idx) {
        const c = COLORS[idx % COLORS.length].replace('#', '%23');
        const t = encodeURIComponent(text.slice(0, 4));
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='${c}' width='150' height='150'/%3E%3Ctext x='75' y='82' text-anchor='middle' fill='white' font-size='16' font-family='sans-serif'%3E${t}%3C/text%3E%3C/svg%3E`;
    }

    // ========== Fisher-Yates 隨機排列 ==========
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // ========== 狀態 ==========
    const ITEMS_MOBILE = 2;
    const ITEMS_DESKTOP = 4;
    const INTERVAL_MS = 4000;

    let shuffled = [];
    let currentPage = 0;
    let timer = null;

    // ========== 初始化 ==========
    async function init() {
        const track = document.getElementById('shopee-game-track');
        if (!track) return;

        const products = await fetchProducts();
        shuffled = shuffle(products);
        render(track);
        startAuto();

        // 左右按鈕
        const prev = document.getElementById('shopee-game-prev');
        const next = document.getElementById('shopee-game-next');
        if (prev) prev.addEventListener('click', () => { goTo(currentPage - 1); resetAuto(); });
        if (next) next.addEventListener('click', () => { goTo(currentPage + 1); resetAuto(); });

        // resize
        window.addEventListener('resize', debounce(() => { render(track); }, 250));
    }

    // ========== 渲染 ==========
    function render(track) {
        track.innerHTML = shuffled.map((p, i) => {
            const img = p.image || placeholderImg(p.name, i);
            return `<a href="${p.url}" target="_blank" rel="noopener noreferrer" class="shopee-game-card">
  <div class="shopee-game-img-wrap">
    <img src="${img}" alt="${p.name}" class="shopee-game-img" loading="lazy" width="150" height="150"
         onerror="this.src='${placeholderImg(p.name, i)}'">
  </div>
  <div class="shopee-game-name">${p.name}</div>
  <div class="shopee-game-price"><span class="shopee-price-label">$</span>${p.price}</div>
</a>`;
        }).join('');

        // Generate dots
        const dotsEl = document.getElementById('shopee-game-dots');
        if (dotsEl) {
            const tp = Math.ceil(shuffled.length / itemsPerPage());
            dotsEl.innerHTML = Array.from({ length: tp }, (_, i) =>
                `<div class="shopee-game-dot${i === 0 ? ' active' : ''}" data-page="${i}"></div>`
            ).join('');
            dotsEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('shopee-game-dot')) {
                    goTo(parseInt(e.target.dataset.page, 10));
                    resetAuto();
                }
            });
        }

        goTo(0);
    }

    // ========== 翻頁 ==========
    function itemsPerPage() {
        return window.innerWidth >= 600 ? ITEMS_DESKTOP : ITEMS_MOBILE;
    }

    function totalPages() {
        return Math.ceil(shuffled.length / itemsPerPage());
    }

    function goTo(page) {
        const tp = totalPages();
        currentPage = ((page % tp) + tp) % tp;
        const track = document.getElementById('shopee-game-track');
        if (!track) return;
        const card = track.querySelector('.shopee-game-card');
        if (!card) return;
        const cardW = card.offsetWidth;
        const gap = 12;
        const offset = currentPage * itemsPerPage() * (cardW + gap);
        track.style.transform = `translateX(-${offset}px)`;
        updateDots();
    }

    function updateDots() {
        const dots = document.querySelectorAll('.shopee-game-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === currentPage));
    }

    // ========== 自動播放 ==========
    function startAuto() {
        stopAuto();
        timer = setInterval(() => goTo(currentPage + 1), INTERVAL_MS);
    }
    function stopAuto() {
        if (timer) { clearInterval(timer); timer = null; }
    }
    function resetAuto() { startAuto(); }

    // ========== 工具 ==========
    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    // ========== 等 DOM ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
