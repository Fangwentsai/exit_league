/**
 * Vercel API Route: 獲取 Shopee 商品並生成分潤連結
 * 
 * Shopee Affiliate Open API:
 * - shopee_offer: 獲取賣場商品
 * - product_offer: 獲取單一商品
 * - short_link: 生成分潤連結
 * 
 * 文檔：https://affiliate.shopee.tw/open_api/document
 */

const crypto = require('crypto');

// Shopee Affiliate API 設定
const SHOPEE_API_HOST = 'https://open-api.affiliate.shopee.tw';

/**
 * 生成 API 簽名 (SHA256)
 */
function generateSignature(appId, timestamp, payload, secretKey) {
    const baseString = `${appId}${timestamp}${payload}${secretKey}`;
    return crypto.createHash('sha256').update(baseString).digest('hex');
}

/**
 * 調用 Shopee Affiliate API (REST)
 */
async function callShopeeAPI(endpoint, params = {}) {
    const appId = process.env.SHOPEE_APP_ID;
    const secretKey = process.env.SHOPEE_SECRET_KEY;
    
    if (!appId || !secretKey) {
        throw new Error('Missing SHOPEE_APP_ID or SHOPEE_SECRET_KEY in environment variables');
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(params);
    const signature = generateSignature(appId, timestamp, payload, secretKey);
    
    const url = `${SHOPEE_API_HOST}${endpoint}`;
    
    console.log(`📡 調用 Shopee API: ${endpoint}`);
    console.log(`📦 參數:`, params);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
        },
        body: payload
    });
    
    const responseText = await response.text();
    console.log(`📥 回應狀態: ${response.status}`);
    console.log(`📥 回應內容: ${responseText.substring(0, 500)}`);
    
    if (!response.ok) {
        throw new Error(`Shopee API error: ${response.status} - ${responseText}`);
    }
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error(`Failed to parse response: ${responseText}`);
    }
}

/**
 * 搜尋商品 (Product Offer API)
 * 文檔: https://affiliate.shopee.tw/open_api/list?type=product_offer
 */
async function searchProducts(keyword, limit = 6) {
    return callShopeeAPI('/graphql', {
        query: `
            query ($keyword: String!, $limit: Int, $sortType: Int) {
                productOfferV2(keyword: $keyword, limit: $limit, sortType: $sortType) {
                    nodes {
                        itemId
                        shopId
                        productName
                        productLink
                        offerLink
                        imageUrl
                        priceMin
                        priceMax
                        sales
                        commissionRate
                        ratingStar
                        shopName
                    }
                }
            }
        `,
        variables: {
            keyword: keyword,
            limit: limit,
            sortType: 2 // 銷量排序
        }
    });
}

/**
 * 獲取賣場商品 (Shopee Offer API)
 * 文檔: https://affiliate.shopee.tw/open_api/list?type=shopee_offer
 */
async function getShopProducts(shopName, limit = 6) {
    const shopUrl = `https://shopee.tw/${shopName}`;
    
    return callShopeeAPI('/graphql', {
        query: `
            query ($shopUrl: String, $limit: Int, $sortType: Int) {
                shopOfferV2(shopUrl: $shopUrl, limit: $limit, sortType: $sortType) {
                    nodes {
                        itemId
                        shopId
                        productName
                        productLink
                        offerLink
                        imageUrl
                        priceMin
                        priceMax
                        sales
                        commissionRate
                        ratingStar
                        shopName
                    }
                }
            }
        `,
        variables: {
            shopUrl: shopUrl,
            limit: limit,
            sortType: 2 // 銷量排序
        }
    });
}

/**
 * 主要 API Handler
 */
module.exports = async function handler(req, res) {
    // CORS 設置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { mode = '', keyword = '飛鏢', shop = '', limit = '6', itemIds = '', shopId = '' } = req.query;

        // ===== mode=images：多組關鍵字並行搜尋，match itemId 取圖 =====
        if (mode === 'images' && itemIds) {
            const idList = itemIds.split(',').map(s => s.trim()).filter(Boolean);
            const idSet = new Set(idList.map(String));
            console.log(`\n🖼️ === mode=images: 用關鍵字搜尋圖片，${idList.length} 個目標 itemId ===`);

            // 多組關鍵字覆蓋不同品類（與主頁 shopee-carousel.js 相同機制）
            const keywords = [
                'AA Darts Fit Point',
                'AA Darts Fit Flight',
                'AA Darts L-Flight',
                'AA Darts K-FLEX',
                'AA Darts Fit Shaft',
                'AA Darts L-Shaft',
            ];

            // 並行搜尋所有關鍵字
            const allNodes = await Promise.all(
                keywords.map(async (kw) => {
                    try {
                        const d = await callShopeeAPI('/graphql', {
                            query: `
                                query ($keyword: String!, $limit: Int, $sortType: Int) {
                                    productOfferV2(keyword: $keyword, limit: $limit, sortType: $sortType) {
                                        nodes { itemId imageUrl }
                                    }
                                }
                            `,
                            variables: { keyword: kw, limit: 20, sortType: 2 }
                        });
                        return d?.data?.productOfferV2?.nodes || [];
                    } catch (e) {
                        console.warn(`⚠️ 搜尋 "${kw}" 失敗:`, e.message);
                        return [];
                    }
                })
            );

            // 聚合所有結果，建立 itemId -> imageUrl map
            const imageMap = {};
            allNodes.flat().forEach(n => {
                const id = String(n.itemId);
                if (idSet.has(id) && n.imageUrl && !imageMap[id]) {
                    imageMap[id] = n.imageUrl;
                }
            });

            console.log(`✅ 找到 ${Object.keys(imageMap).length}/${idList.length} 張圖`);
            const images = idList.map(id => ({ id: Number(id), image: imageMap[id] || '' }));
            return res.status(200).json({ images, found: Object.keys(imageMap).length });
        }

        // ===== 原有模式：回傳完整商品列表 =====
        const limitNum = parseInt(limit, 10);
        
        console.log(`\n🛒 === Shopee API 請求 ===`);
        console.log(`📍 shop: ${shop}, keyword: ${keyword}, limit: ${limitNum}`);
        
        let data;
        let nodes = [];
        
        // 優先使用賣場搜尋
        if (shop) {
            console.log(`🏪 搜尋賣場: ${shop}`);
            data = await getShopProducts(shop, limitNum);
            console.log(`🏪 shopOfferV2 回傳:`, JSON.stringify(data, null, 2).substring(0, 1000));
            nodes = data?.data?.shopOfferV2?.nodes || [];
            
            if (nodes.length > 0) {
                const shopNames = [...new Set(nodes.map(n => n.shopName))];
                console.log(`🏪 實際賣場: ${shopNames.join(', ')}`);
            }
        }
        
        // 如果賣場沒有結果，使用關鍵字搜尋
        if (nodes.length === 0) {
            console.log(`🔍 搜尋關鍵字: ${keyword}`);
            data = await searchProducts(keyword, limitNum);
            nodes = data?.data?.productOfferV2?.nodes || [];
        }
        
        console.log(`📦 獲取到 ${nodes.length} 個商品`);
        
        if (nodes.length === 0) {
            return res.status(200).json({
                products: [],
                message: 'No products found',
                debug: data
            });
        }
        
        // 組裝商品資料
        let products = nodes.map(node => ({
            id: node.itemId,
            name: node.productName,
            price: Math.floor(node.priceMin || 0),
            originalPrice: node.priceMax && node.priceMax > node.priceMin ? Math.floor(node.priceMax) : null,
            discount: null,
            image: node.imageUrl,
            sold: node.sales || 0,
            rating: node.ratingStar || 0,
            shopName: node.shopName || '',
            url: node.offerLink || node.productLink,
            commissionRate: node.commissionRate
        }));
        
        // 過濾掉不想要的商品
        const excludeKeywords = ['原廠公鏢', '公鏢組'];
        products = products.filter(p => 
            !excludeKeywords.some(kw => p.name.includes(kw))
        );
        
        // 按銷量從高到低排序
        products = products.sort((a, b) => b.sold - a.sold);
        
        // 取得實際賣場名稱
        const actualShops = [...new Set(products.map(p => p.shopName).filter(Boolean))];
        
        console.log(`✅ 成功處理 ${products.length} 個商品`);
        
        return res.status(200).json({
            products,
            count: products.length,
            source: shop ? `shop:${shop}` : `keyword:${keyword}`,
            actualShops: actualShops
        });
        
    } catch (error) {
        console.error('❌ Shopee API 錯誤:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch products',
            message: error.message
        });
    }
};
