/**
 * Shopee 商品輪播模組 - game_result 頁面專用
 * 動態從 /api/shopee-products 拉取商品（含 imageUrl）
 * Vercel 環境：顯示真實圖片；localhost：fallback 靜態資料 + SVG 佔位圖
 * Desktop 每頁 4 個 / Mobile 每頁 2 個
 */

(function () {
    'use strict';

    // ========== 主商品清單：以 CSV 為主，名稱/價格/推廣連結固定 ==========
    // shopId: 50984140 (AA darts Shop AsiA 飛鏢專賣店) — 更新自 item_0326_2.csv
    const csvProducts = [
        { id: 868804330,   name: 'Fit Point Plus 50入裝 [2BA]',                              price: 95,  url: 'https://s.shopee.tw/W2DI3PC5v',  productUrl: 'https://shopee.tw/product/50984140/868804330',   image: '' },
        { id: 877015604,   name: 'Fit Flight AIR 薄鏢翼 3入裝 素色 [Standard]',              price: 142, url: 'https://s.shopee.tw/20r14oJU3E', productUrl: 'https://shopee.tw/product/50984140/877015604',   image: '' },
        { id: 902648309,   name: 'Fit Flight AIR 薄鏢翼 3入裝 素色 [Shape]',                 price: 142, url: 'https://s.shopee.tw/2BARH7IqiH', productUrl: 'https://shopee.tw/product/50984140/902648309',   image: '' },
        { id: 868833814,   name: 'L-style Premium Lippoint 30入裝 [2BA]',                    price: 133, url: 'https://s.shopee.tw/2LTrTQIDNK', productUrl: 'https://shopee.tw/product/50984140/868833814',   image: '' },
        { id: 903053372,   name: 'L-SHaft Lock Straight New Color 2020 塑膠/鎖桿(粗)',        price: 133, url: 'https://s.shopee.tw/2VnHfjHa2N', productUrl: 'https://shopee.tw/product/50984140/903053372',   image: '' },
        { id: 16881530965, name: 'L-style Premium Lippoint LONG 30入裝 [2BA]',               price: 152, url: 'https://s.shopee.tw/1LbKHaM1PA', productUrl: 'https://shopee.tw/product/50984140/16881530965',  image: '' },
        { id: 905252508,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (White)',                   price: 161, url: 'https://s.shopee.tw/1VukTtLO4D', productUrl: 'https://shopee.tw/product/50984140/905252508',   image: '' },
        { id: 2425820787,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (White)',                    price: 161, url: 'https://s.shopee.tw/1gEAgCKkjG', productUrl: 'https://shopee.tw/product/50984140/2425820787',  image: '' },
        { id: 904946350,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Black)',                   price: 161, url: 'https://s.shopee.tw/1qXasVK7OJ', productUrl: 'https://shopee.tw/product/50984140/904946350',   image: '' },
        { id: 2425798231,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Black)',                    price: 161, url: 'https://s.shopee.tw/3LMOfGEPLc', productUrl: 'https://shopee.tw/product/50984140/2425798231',  image: '' },
        { id: 2420534054,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Clear)',                    price: 161, url: 'https://s.shopee.tw/3VforZDm0f', productUrl: 'https://shopee.tw/product/50984140/2420534054',  image: '' },
        { id: 905256726,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Clear)',                   price: 161, url: 'https://s.shopee.tw/3fzF3sD8fi', productUrl: 'https://shopee.tw/product/50984140/905256726',   image: '' },
        { id: 2425955632,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Yellow)',                   price: 161, url: 'https://s.shopee.tw/3qIfGBCVKl', productUrl: 'https://shopee.tw/product/50984140/2425955632',  image: '' },
        { id: 2420454232,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Yellow)',                  price: 161, url: 'https://s.shopee.tw/2g6hs2GwhY', productUrl: 'https://shopee.tw/product/50984140/2420454232',  image: '' },
        { id: 905270211,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Green)',                   price: 161, url: 'https://s.shopee.tw/2qQ84LGJMb', productUrl: 'https://shopee.tw/product/50984140/905270211',   image: '' },
        { id: 2425937250,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Green)',                    price: 161, url: 'https://s.shopee.tw/30jYGeFg1e', productUrl: 'https://shopee.tw/product/50984140/2425937250',  image: '' },
        { id: 905305969,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Pink)',                    price: 161, url: 'https://s.shopee.tw/3B2ySxF2gh', productUrl: 'https://shopee.tw/product/50984140/905305969',   image: '' },
        { id: 905463560,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Red)',                     price: 161, url: 'https://s.shopee.tw/4frmFi9Ke0', productUrl: 'https://shopee.tw/product/50984140/905463560',   image: '' },
        { id: 2425916103,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Orange)',                   price: 161, url: 'https://s.shopee.tw/4qBCS18hJ3', productUrl: 'https://shopee.tw/product/50984140/2425916103',  image: '' },
        { id: 905301884,   name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Orange)',                  price: 161, url: 'https://s.shopee.tw/50UceK83y6', productUrl: 'https://shopee.tw/product/50984140/905301884',   image: '' },
        { id: 2425898929,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Purple)',                   price: 161, url: 'https://s.shopee.tw/5Ao2qd7Qd9', productUrl: 'https://shopee.tw/product/50984140/2425898929',  image: '' },
        { id: 2709255132,  name: 'L-Flight EZ Combined 3入裝 素色鏢翼 [Standard]',            price: 171, url: 'https://s.shopee.tw/40c5SUBrzw', productUrl: 'https://shopee.tw/product/50984140/2709255132',  image: '' },
        { id: 22041383321, name: 'Fit Flight 柴崎晋之介 選手款鏢翼 [Shape]',                  price: 180, url: 'https://s.shopee.tw/4AvVenBEez', productUrl: 'https://shopee.tw/product/50984140/22041383321',  image: '' },
        { id: 47505872379, name: 'Fit Flight 荏隈秀一 ver.3 選手款 [Shape]',                  price: 180, url: 'https://s.shopee.tw/4LEvr6AbK2', productUrl: 'https://shopee.tw/product/50984140/47505872379',  image: '' },
        { id: 27362737182, name: 'Fit Flight 馬場善久 ver.3 選手款 [Shape]',                  price: 180, url: 'https://s.shopee.tw/4VYM3P9xz5', productUrl: 'https://shopee.tw/product/50984140/27362737182',  image: '' },
        { id: 28401605877, name: 'Fit Flight Cheeks [Standard/Shape]',                       price: 180, url: 'https://s.shopee.tw/60N9qA4FwO', productUrl: 'https://shopee.tw/product/50984140/28401605877',  image: '' },
        { id: 24635530101, name: 'Fit Flight 普波騰列 ver.4 選手款 [Shape]',                  price: 180, url: 'https://s.shopee.tw/6Aga2T3cbR', productUrl: 'https://shopee.tw/product/50984140/24635530101',  image: '' },
        { id: 45350619951, name: 'Fit Flight Terry Tan ver.1 選手款 [Shape/Rocket]',          price: 180, url: 'https://s.shopee.tw/6L00Em2zGU', productUrl: 'https://shopee.tw/product/50984140/45350619951',  image: '' },
        { id: 43860036824, name: 'Fit Flight 岩崎奈美 ver.1 選手款 [Shape]',                  price: 180, url: 'https://s.shopee.tw/6VJQR52LvX', productUrl: 'https://shopee.tw/product/50984140/43860036824',  image: '' },
        { id: 848467167,   name: 'Fit Flight 厚鏢翼 素色 6入裝 [Shape]',                     price: 190, url: 'https://s.shopee.tw/5L7T2w6nIK', productUrl: 'https://shopee.tw/product/50984140/848467167',   image: '' },
        { id: 897027059,   name: 'Fit Flight 厚鏢翼 素色 6入裝 [Standard]',                  price: 190, url: 'https://s.shopee.tw/5VQtFF69xN', productUrl: 'https://shopee.tw/product/50984140/897027059',   image: '' },
        { id: 45957258433, name: 'Fit Flight GLIMSTER JOKER 小丑 [Shape]',                   price: 209, url: 'https://s.shopee.tw/5fkJRY5WcQ', productUrl: 'https://shopee.tw/product/50984140/45957258433',  image: '' },
        { id: 46455881127, name: 'Fit Flight AIR Tamrin Ng ver.2 選手款 [Shape]',             price: 218, url: 'https://s.shopee.tw/5q3jdr4tHT', productUrl: 'https://shopee.tw/product/50984140/46455881127',  image: '' },
        { id: 26989092022, name: 'Fit Flight AIR 岩崎奈美 ver.1 選手款 [Shape]',              price: 218, url: 'https://s.shopee.tw/7KsXQbzBEm', productUrl: 'https://shopee.tw/product/50984140/26989092022',  image: '' },
        { id: 28301605320, name: 'Fit Flight AIR 柴崎晋之介 Ver.2 選手款 [Shape]',            price: 218, url: 'https://s.shopee.tw/7VBxcuyXtp', productUrl: 'https://shopee.tw/product/50984140/28301605320',  image: '' },
        { id: 42472646551, name: 'Fit Flight AIR 藤田真子 ver.1 選手款 [Shape]',              price: 218, url: 'https://s.shopee.tw/7fVNpDxuYs', productUrl: 'https://shopee.tw/product/50984140/42472646551',  image: '' },
        { id: 15799518815, name: 'TARGET K-FLEX 素色一體式尾翼 [Shape]',                     price: 247, url: 'https://s.shopee.tw/7poo1WxHDv', productUrl: 'https://shopee.tw/product/50984140/15799518815',  image: '' },
        { id: 29613894594, name: 'TARGET K-FLEX NEON 素色一體式鏢翼 [Shape]',                price: 247, url: 'https://s.shopee.tw/6fcqdO1iai', productUrl: 'https://shopee.tw/product/50984140/29613894594',  image: '' },
        { id: 25027147618, name: 'TARGET K-FLEX 素色一體式鏢翼 [Standard]',                  price: 247, url: 'https://s.shopee.tw/6pwGph15Fl', productUrl: 'https://shopee.tw/product/50984140/25027147618',  image: '' },
        { id: 24443888804, name: '【限定】K-FLEX TARGET JAPAN Logo [Shape]',                  price: 247, url: 'https://s.shopee.tw/70Fh200Ruo', productUrl: 'https://shopee.tw/product/50984140/24443888804',  image: '' },
        { id: 20195963128, name: 'TARGET K-FLEX RGB Series 一體式素色鏢翼 [Shape]',           price: 247, url: 'https://s.shopee.tw/7AZ7EIzoZr', productUrl: 'https://shopee.tw/product/50984140/20195963128',  image: '' },
        { id: 28524447808, name: '【限定】K-FLEX TARGET JAPAN Logo [Standard]',               price: 247, url: 'https://s.shopee.tw/8fNv13u6XA', productUrl: 'https://shopee.tw/product/50984140/28524447808',  image: '' },
        { id: 25877147858, name: 'TARGET K-FLEX RGB Series 一體式素色鏢翼 [Standard]',        price: 247, url: 'https://s.shopee.tw/8phLDMtTCD', productUrl: 'https://shopee.tw/product/50984140/25877147858',  image: '' },
        { id: 27963910077, name: 'TARGET K-FLEX NEON 素色一體式鏢翼 [Standard]',             price: 247, url: 'https://s.shopee.tw/900lPfsprG', productUrl: 'https://shopee.tw/product/50984140/27963910077',  image: '' },
        { id: 45351194233, name: 'TARGET CHARIS 2025 K-FLEX 梁雨恩 選手款 [Shape]',          price: 313, url: 'https://s.shopee.tw/9AKBbysCWJ', productUrl: 'https://shopee.tw/product/50984140/45351194233',  image: '' },
        { id: 29159081720, name: 'TARGET RISING SUN K-FLEX 村松治樹 選手款 [Shape]',         price: 313, url: 'https://s.shopee.tw/808EDpwdt6', productUrl: 'https://shopee.tw/product/50984140/29159081720',  image: '' },
        { id: 27115891616, name: 'TRiNiDAD CONDOR AXE 120 素色一體式鏢翼 [Shape]',           price: 361, url: 'https://s.shopee.tw/8AReQ8w0Y9', productUrl: 'https://shopee.tw/product/50984140/27115891616',  image: '' },
        { id: 22017102420, name: 'TRiNiDAD CONDOR AXE Neon Series 素色鏢翼 [Shape]',         price: 361, url: 'https://s.shopee.tw/8Kl4cRvNDC', productUrl: 'https://shopee.tw/product/50984140/22017102420',  image: '' },
        { id: 25543546477, name: 'TRiNiDAD CONDOR AXE 素色一體式鏢翼 [Shape]',               price: 361, url: 'https://s.shopee.tw/8V4UokujsF', productUrl: 'https://shopee.tw/product/50984140/25543546477',  image: '' },
        { id: 27682054433, name: 'TRiNiDAD CONDOR AXE 素色一體式鏢翼 [Standard]',            price: 361, url: 'https://s.shopee.tw/9ztIbVp1pY', productUrl: 'https://shopee.tw/product/50984140/27682054433',  image: '' },
        { id: 24827144653, name: 'TRiNiDAD CONDOR AXE 120 素色一體式鏢翼 [Standard]',        price: 361, url: 'https://s.shopee.tw/AACinooOUb', productUrl: 'https://shopee.tw/product/50984140/24827144653',  image: '' },
        { id: 24212885991, name: 'TRiNiDAD CONDOR AXE Neon Series 素色鏢翼 [Standard]',      price: 361, url: 'https://s.shopee.tw/AKW907nl9e', productUrl: 'https://shopee.tw/product/50984140/24212885991',  image: '' },
        { id: 26628483998, name: 'TRiNiDAD CONDOR AXE L4zyAlone 松吉輝宗 選手款 [Standard]', price: 380, url: 'https://s.shopee.tw/AUpZCQn7oh', productUrl: 'https://shopee.tw/product/50984140/26628483998',  image: '' },
        { id: 29978474223, name: 'TRiNiDAD CONDOR AXE L4zyAlone 松吉輝宗 選手款 [Shape]',   price: 380, url: 'https://s.shopee.tw/9KdboHrZBU', productUrl: 'https://shopee.tw/product/50984140/29978474223',  image: '' },
        { id: 43371642152, name: 'TRiNiDAD CONDOR AXE A/N 呂安昇 選手款 [Shape]',            price: 380, url: 'https://s.shopee.tw/9Ux20aqvqX', productUrl: 'https://shopee.tw/product/50984140/43371642152',  image: '' },
        { id: 27743782822, name: 'CONDOR AXE THE DANGER John Hurring 選手款 [Standard]',     price: 380, url: 'https://s.shopee.tw/9fGSCtqIVa', productUrl: 'https://shopee.tw/product/50984140/27743782822',  image: '' },
        { id: 29538347276, name: 'TRiNiDAD CONDOR AXE THUNDER BITE 宮脇実由 選手款 [Shape]', price: 380, url: 'https://s.shopee.tw/9pZsPCpfAd', productUrl: 'https://shopee.tw/product/50984140/29538347276',  image: '' },
        { id: 54601029502, name: 'CONDOR AXE 120 Death or Practice 西哲平 選手款 [Shape]',   price: 380, url: 'https://s.shopee.tw/qf3gfNvQu',  productUrl: 'https://shopee.tw/product/50984140/54601029502',  image: '' },
    ];

    // ========== 向 API 傳入商品名稱取圖片，直接更新傳入的 batch 陣列 ==========
    async function fetchImagesForBatch(batch) {
        if (!batch || batch.length === 0) return;
        try {
            const itemNamesAndIds = batch.map(p => {
                const cleanName = p.name.replace('【AA飛鏢專賣店】', '').trim();
                return `${p.id}::${cleanName}`;
            }).join('||');
            
            const response = await fetch(`/api/shopee-products?mode=images_by_name&itemData=${encodeURIComponent(itemNamesAndIds)}&shopId=50984140`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (data.images && data.images.length > 0) {
                const imageMap = {};
                data.images.forEach(item => { if (item.image) imageMap[item.id] = item.image; });
                batch.forEach(p => {
                    if (imageMap[p.id]) p.image = imageMap[p.id];
                });
            }
        } catch (err) {
            console.warn('⚠️ Shopee chunk fetch failed:', err.message);
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

        // 加入加載中動畫 (Loading Spinner)
        track.innerHTML = `
            <div style="width:100%; display:flex; justify-content:center; align-items:center; height:150px;">
                <div class="shopee-game-spinner"></div>
                <span style="margin-left:12px; color:#EE4D2D; font-size:14px; font-weight:bold; letter-spacing: 1px;">為您準備專屬推薦...</span>
            </div>
            <style>
                .shopee-game-spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #EE4D2D;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;

        // 拆分兩個批次：首批 12 個 (約 20%)，剩餘 46 個
        // 切分原始陣列以保持每次請求的 URL 完全相同，進而 100% 命中 Vercel 快取
        const batch1 = csvProducts.slice(0, 12);
        const batch2 = csvProducts.slice(12);

        // 同時發出請求
        const p1 = fetchImagesForBatch(batch1);
        const p2 = fetchImagesForBatch(batch2);

        // 只等待第一批 (約 12 個) 處理完，即刻渲染畫面
        await p1;
        
        // 打亂順序展現給使用者
        shuffled = shuffle([...csvProducts]);
        render(track);
        startAuto();

        // 在背景等待剩餘的 46 個商品圖片載入
        p2.then(() => {
            // 載入完成後，將背景圖偷偷替換掉畫面上還是 SVG 佔位圖的元素
            batch2.forEach(p => {
                if (p.image) {
                    const imgEl = track.querySelector(`.shopee-game-img[data-id="${p.id}"]`);
                    if (imgEl) imgEl.src = p.image;
                }
            });
            console.log('✅ Shopee 背景剩餘圖片載入完畢與替換完成');
        });

        // 左右按鈕
        const prev = document.getElementById('shopee-game-prev');
        const next = document.getElementById('shopee-game-next');
        if (prev) prev.addEventListener('click', () => { goTo(currentPage - 1); resetAuto(); });
        if (next) next.addEventListener('click', () => { goTo(currentPage + 1); resetAuto(); });

        // 手機手勢滑動 (Swipe)
        const wrapper = document.querySelector('.shopee-game-track-wrapper');
        if (wrapper) {
            let startX = 0;
            let endX = 0;
            wrapper.addEventListener('touchstart', e => {
                startX = e.changedTouches[0].screenX;
                stopAuto();
            }, {passive: true});
            wrapper.addEventListener('touchend', e => {
                endX = e.changedTouches[0].screenX;
                handleSwipe(startX, endX);
                resetAuto();
            }, {passive: true});
        }

        // resize
        window.addEventListener('resize', debounce(() => { render(track); }, 250));
    }

    // 處理手勢邏輯
    function handleSwipe(startX, endX) {
        const swipeThreshold = 40; // 只要滑動超過 40px 就觸發換頁
        if (startX - endX > swipeThreshold) {
            goTo(currentPage + 1); // 往左滑 (手指左移) -> 下一頁
        } else if (endX - startX > swipeThreshold) {
            goTo(currentPage - 1); // 往右滑 (手指右移) -> 上一頁
        }
    }

    // ========== 渲染 ==========
    function render(track) {
        track.innerHTML = shuffled.map((p, i) => {
            const img = p.image || placeholderImg(p.name, i);
            return `<a href="${p.url}" target="_blank" rel="noopener noreferrer" class="shopee-game-card" onclick="if(window.gtag) gtag('event', 'click_shopee_game_result', { 'event_category': 'Shopee', 'event_label': '${p.name.replace(/'/g, "\\'")}' });">
  <div class="shopee-game-img-wrap">
    <img src="${img}" data-id="${p.id}" alt="${p.name}" class="shopee-game-img" loading="lazy" width="150" height="150"
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
