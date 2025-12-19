/**
 * Shopee 商品輪播模組
 * 用於展示飛鏢相關商品推薦
 */

(function() {
    'use strict';

    // ========== 生成 SVG 佔位圖 ==========
    function createPlaceholderImage(text, bgColor = '#EE4D2D') {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='${bgColor.replace('#', '%23')}' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='12' font-family='sans-serif'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
    }

    // ========== 假資料（API 失敗時使用）==========
    const mockProducts = [
        {
            id: 1,
            name: '【AA飛鏢】軟式鏢頭 50入 耐用防斷',
            price: 149,
            originalPrice: 250,
            discount: 40,
            image: createPlaceholderImage('鏢頭', '#EE4D2D'),
            sold: 2341,
            url: 'https://shopee.tw/aadarts'
        },
        {
            id: 2,
            name: '【AA飛鏢】硬殼收納盒 可放6支鏢',
            price: 399,
            originalPrice: 599,
            discount: 33,
            image: createPlaceholderImage('收納盒', '#FF6633'),
            sold: 567,
            url: 'https://shopee.tw/aadarts'
        },
        {
            id: 3,
            name: '【AA飛鏢】標準尾翼 100片裝 多色可選',
            price: 199,
            originalPrice: 350,
            discount: 43,
            image: createPlaceholderImage('尾翼', '#FF8844'),
            sold: 856,
            url: 'https://shopee.tw/aadarts'
        },
        {
            id: 4,
            name: '【AA飛鏢】專業鋁合金鏢桿 輕量化設計',
            price: 299,
            originalPrice: 450,
            discount: 33,
            image: createPlaceholderImage('鏢桿', '#EE4D2D'),
            sold: 1234,
            url: 'https://shopee.tw/aadarts'
        },
        {
            id: 5,
            name: '【AA飛鏢】18吋練習靶 靜音款',
            price: 899,
            originalPrice: 1299,
            discount: 31,
            image: createPlaceholderImage('練習靶', '#FF6633'),
            sold: 423,
            url: 'https://shopee.tw/aadarts'
        },
        {
            id: 6,
            name: '【AA飛鏢】入門飛鏢組 3支裝',
            price: 599,
            originalPrice: 899,
            discount: 33,
            image: createPlaceholderImage('飛鏢組', '#FF8844'),
            sold: 789,
            url: 'https://shopee.tw/aadarts'
        }
    ];

    // ========== 輪播設定 ==========
    const config = {
        itemsPerView: 2,
        itemsPerViewMobile: 2,
        autoPlayInterval: 5000,
        enableAutoPlay: true
    };

    let currentIndex = 0;
    let autoPlayTimer = null;
    let products = [];

    // ========== 初始化 ==========
    function init() {
        console.log('🛒 Shopee 輪播初始化中...');
        
        fetchProducts()
            .then(data => {
                products = data;
                renderCarousel();
                setupEventListeners();
                if (config.enableAutoPlay) {
                    startAutoPlay();
                }
                console.log('✅ Shopee 輪播初始化完成');
            })
            .catch(error => {
                console.warn('⚠️ API 獲取失敗，使用假資料:', error);
                products = mockProducts;
                renderCarousel();
                setupEventListeners();
                if (config.enableAutoPlay) {
                    startAutoPlay();
                }
            });
    }

    // ========== 從 API 獲取商品 ==========
    async function fetchProducts() {
        try {
            // 調用 Vercel API Route，搜尋 AA Darts 飛鏢專賣店商品（抓15筆，混合熱賣與新品）
            const response = await fetch('/api/shopee-products?keyword=AA%20Darts&limit=15');
            
            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.products && data.products.length > 0) {
                console.log('✅ 成功從 Shopee API 獲取商品:', data.products.length, '件');
                console.log('📊 來源:', data.source);
                return data.products;
            }
            
            throw new Error('沒有獲取到商品');
        } catch (error) {
            console.warn('⚠️ Shopee API 獲取失敗，使用假資料:', error.message);
            return mockProducts;
        }
    }

    // ========== 渲染輪播 ==========
    function renderCarousel() {
        const track = document.getElementById('shopee-track');
        const dotsContainer = document.getElementById('shopee-dots');
        
        if (!track) {
            console.warn('找不到輪播軌道元素');
            return;
        }

        track.innerHTML = products.map(product => createProductCard(product)).join('');

        const itemsPerView = getItemsPerView();
        const totalPages = Math.ceil(products.length / itemsPerView);
        
        if (dotsContainer) {
            dotsContainer.innerHTML = Array.from({ length: totalPages }, (_, i) => 
                `<div class="shopee-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`
            ).join('');
        }

        updateCarouselPosition();
    }

    // ========== 創建商品卡片 HTML ==========
    function createProductCard(product) {
        const discountBadge = product.discount 
            ? `<span class="product-discount-badge">-${product.discount}%</span>` 
            : '';
        
        const originalPriceHtml = product.originalPrice 
            ? `<span class="product-original-price">$${product.originalPrice}</span>` 
            : '';

        const soldText = product.sold >= 1000 
            ? `${(product.sold / 1000).toFixed(1)}k 已售` 
            : `${product.sold} 已售`;

        return `
            <a href="${product.url}" target="_blank" rel="noopener noreferrer" class="shopee-product-card">
                <div class="product-image-container">
                    <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" width="100" height="100"
                         onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23EE4D2D%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2214%22 font-family=%22sans-serif%22%3E商品%3C/text%3E%3C/svg%3E';">
                    ${discountBadge}
                </div>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price-row">
                        <span class="product-price">$${product.price}</span>
                        ${originalPriceHtml}
                    </div>
                    <div class="product-sold">${soldText}</div>
                </div>
            </a>
        `;
    }

    // ========== 設置事件監聽 ==========
    function setupEventListeners() {
        const prevBtn = document.getElementById('shopee-prev');
        const nextBtn = document.getElementById('shopee-next');
        const dotsContainer = document.getElementById('shopee-dots');
        const section = document.querySelector('.shopee-carousel-section');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                goToPrev();
                resetAutoPlay();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                goToNext();
                resetAutoPlay();
            });
        }

        if (dotsContainer) {
            dotsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('shopee-dot')) {
                    const index = parseInt(e.target.dataset.index, 10);
                    goToPage(index);
                    resetAutoPlay();
                }
            });
        }

        if (section) {
            section.addEventListener('mouseenter', stopAutoPlay);
            section.addEventListener('mouseleave', () => {
                if (config.enableAutoPlay) startAutoPlay();
            });
        }

        window.addEventListener('resize', debounce(() => {
            renderCarousel();
        }, 250));
    }

    // ========== 輪播導航 ==========
    function goToPrev() {
        const itemsPerView = getItemsPerView();
        const maxIndex = Math.ceil(products.length / itemsPerView) - 1;
        currentIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
        updateCarouselPosition();
    }

    function goToNext() {
        const itemsPerView = getItemsPerView();
        const maxIndex = Math.ceil(products.length / itemsPerView) - 1;
        currentIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
        updateCarouselPosition();
    }

    function goToPage(index) {
        currentIndex = index;
        updateCarouselPosition();
    }

    // ========== 更新輪播位置 ==========
    function updateCarouselPosition() {
        const track = document.getElementById('shopee-track');
        const dots = document.querySelectorAll('.shopee-dot');
        
        if (!track) return;

        const itemsPerView = getItemsPerView();
        const cardWidth = track.querySelector('.shopee-product-card')?.offsetWidth || 150;
        const gap = 15;
        const offset = currentIndex * itemsPerView * (cardWidth + gap);
        
        track.style.transform = `translateX(-${offset}px)`;

        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    // ========== 自動播放 ==========
    function startAutoPlay() {
        stopAutoPlay();
        autoPlayTimer = setInterval(goToNext, config.autoPlayInterval);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }

    function resetAutoPlay() {
        if (config.enableAutoPlay) {
            stopAutoPlay();
            startAutoPlay();
        }
    }

    // ========== 工具函數 ==========
    function getItemsPerView() {
        return window.innerWidth <= 768 ? config.itemsPerViewMobile : config.itemsPerView;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ========== DOM 載入完成後初始化 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.ShopeeCarousel = {
        refresh: renderCarousel,
        next: goToNext,
        prev: goToPrev,
        goToPage: goToPage
    };

})();
