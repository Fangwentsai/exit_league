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
                        priceDiscountRate
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
                        priceDiscountRate
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
 * 用 subIds 產生真正會被蝦皮分潤後台記錄的追蹤短連結
 *
 * 之前直接在 offerLink 後面手動接 ?sub_id1=index 完全沒用——蝦皮後台的
 * 點擊報告 Sub_id 欄位全部是空的（"----"）。查了官方 API 文件才發現 sub_id
 * 不是 URL 參數，是 GraphQL 的獨立 mutation：generateShortLink，要在產生
 * 連結的當下就把 subIds 一起帶進去，事後在網址後面加參數蝦皮不會認。
 * 文件: sub_id 會被寫入分潤報表的 utm_content 欄位，最多 5 組。
 */
async function generateShortLink(originUrl, subIds) {
    const data = await callShopeeAPI('/graphql', {
        query: `
            mutation ($originUrl: String!, $subIds: [String]) {
                generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
                    shortLink
                }
            }
        `,
        variables: { originUrl, subIds }
    });
    return data?.data?.generateShortLink?.shortLink || null;
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
        const { mode = '', keyword = '飛鏢', shop = '', limit = '6', itemIds = '', shopId = '', productUrls = '' } = req.query;

        // ===== mode=images_by_name：用精準商品名稱查詢 imageUrl =====
        const modeFlag = mode === 'images_by_name' || mode === 'images'; // fallback
        const itemsPayload = mode === 'images_by_name' ? req.query.itemData : productUrls;
        
        if (modeFlag && itemsPayload) {
            let itemList = [];
            if (mode === 'images_by_name') {
                // itemData format: "id1::name1||id2::name2"
                itemList = decodeURIComponent(itemsPayload).split('||').map(s => {
                    const [id, name] = s.split('::');
                    return { id, keyword: name };
                }).filter(i => i.id && i.keyword);
                console.log(`\n🖼️ === mode=images_by_name: 精準名稱查詢，${itemList.length} 個商品 ===`);
            } else {
                // fallback for old cached clients
                const urlList = decodeURIComponent(itemsPayload).split(',').map(s => s.trim()).filter(Boolean);
                itemList = urlList.map(url => ({ id: null, keyword: url }));
            }

            // 並行查詢（每批 3 個，避免過多並發）
            const BATCH = 3;
            const imageMap = {}; // itemId -> imageUrl

            for (let i = 0; i < itemList.length; i += BATCH) {
                const batch = itemList.slice(i, i + BATCH);
                await Promise.all(batch.map(async ({ id, keyword }) => {
                    try {
                        const d = await callShopeeAPI('/graphql', {
                            query: `
                                query ($keyword: String!) {
                                    productOfferV2(keyword: $keyword, limit: 1) {
                                        nodes {
                                            itemId
                                            imageUrl
                                        }
                                    }
                                }
                            `,
                            variables: { keyword }
                        });
                        const nodes = d?.data?.productOfferV2?.nodes;
                        if (nodes && nodes.length > 0) {
                            const offer = nodes[0];
                            if (offer?.imageUrl) {
                                // 如果有傳 id，就用指定的 id；沒有的話就用回傳的 itemId
                                const targetId = id || String(offer.itemId);
                                imageMap[targetId] = offer.imageUrl;
                                console.log(`✅ 找到圖片: ${keyword.substring(0, 15)}...`);
                            }
                        } else {
                            console.log(`❌ 找不到圖片: ${keyword}`);
                            // 記錄錯誤以便 debug
                            imageMap.debug = imageMap.debug || [];
                            imageMap.debug.push(keyword);
                        }
                    } catch (e) {
                        console.warn(`⚠️ "${keyword}" 查詢失敗:`, e.message);
                    }
                }));
            }

            const images = Object.entries(imageMap)
                .filter(([k]) => k !== 'debug')
                .map(([id, image]) => ({ id: Number(id), image }));
                
            console.log(`✅ 最終找到: ${images.length}/${itemList.length} 張圖`);
            
            // 加入快取機制：在 Vercel Edge 節點快取 24 小時（86400 秒），過期後在背景重新驗證（43200 秒）
            res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
            
            return res.status(200).json({ 
                images, 
                found: images.length,
                missing: imageMap.debug || [] // 讓前端看哪些沒找到
            });
        }

        // ===== 原有模式：回傳完整商品列表 =====
        const limitNum = parseInt(limit, 10);
        // 多抓一些候選（上限 50），這樣篩出「特價中」的商品後還有得排，
        // 不會因為篩選折扣就讓最後回傳的商品數比 limitNum 少
        const fetchLimit = Math.min(limitNum * 3, 50);

        console.log(`\n🛒 === Shopee API 請求 ===`);
        console.log(`📍 shop: ${shop}, keyword: ${keyword}, limit: ${limitNum}（實際抓取 ${fetchLimit}）`);

        let data;
        let nodes = [];

        // 優先使用賣場搜尋
        if (shop) {
            console.log(`🏪 搜尋賣場: ${shop}`);
            data = await getShopProducts(shop, fetchLimit);
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
            data = await searchProducts(keyword, fetchLimit);
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
        let products = nodes.map(node => {
            const price = Math.floor(node.priceMin || 0);
            const discount = parseInt(node.priceDiscountRate, 10) || 0;
            // priceDiscountRate 是 Shopee 真正的特價折扣（例如 20 代表打 8 折），
            // 用它反推原價，而不是拿 priceMax（同商品不同款式的價格區間）冒充原價
            const originalPrice = discount > 0 ? Math.round(price / (1 - discount / 100)) : null;
            return {
                id: node.itemId,
                name: node.productName,
                price,
                originalPrice,
                discount: discount > 0 ? discount : null,
                image: node.imageUrl,
                sold: node.sales || 0,
                rating: node.ratingStar || 0,
                shopName: node.shopName || '',
                url: node.offerLink || node.productLink,
                commissionRate: node.commissionRate
            };
        });

        // 過濾掉不想要的商品
        const excludeKeywords = ['原廠公鏢', '公鏢組'];
        products = products.filter(p =>
            !excludeKeywords.some(kw => p.name.includes(kw))
        );

        // 特價中的商品優先於沒打折的（不打折的商品接在後面補滿，不會因為
        // 篩選特價而讓版位開天窗）。這支 API 的回應會被快取 1 小時（見下方
        // Cache-Control），洗牌若放在這裡，同一小時內所有訪客會看到同一組
        // 被快取住的順序——真正的「每個訪客看到不同順序」交給前端
        // js/shopee-carousel.js 拿到這批候選名單後自己洗牌決定顯示順序。
        const onSale = products.filter(p => p.discount).sort((a, b) => b.sold - a.sold);
        const rest = products.filter(p => !p.discount).sort((a, b) => b.sold - a.sold);
        products = [...onSale, ...rest];

        // 篩選/多抓的候選只是排序用，最後還是照原本請求的數量回傳
        products = products.slice(0, limitNum);

        // 幫每個商品換成帶 sub_id 的追蹤短連結（見上面 generateShortLink 的
        // 說明，URL 後面手動加參數蝦皮不認）。這支 API 回應會快取 1 小時，
        // 所以這批額外的 mutation 呼叫平均下來一小時只會真的發生一次，
        // 不會造成太大負擔。單一商品失敗就照舊用原本的 offerLink，不整批擋住。
        const shortLinkDebug = [];
        products = await Promise.all(products.map(async (p) => {
            try {
                const tracked = await generateShortLink(p.url, ['index']);
                shortLinkDebug.push({ id: p.id, originalUrl: p.url, trackedUrl: tracked, changed: tracked !== p.url });
                return tracked ? { ...p, url: tracked } : p;
            } catch (e) {
                shortLinkDebug.push({ id: p.id, originalUrl: p.url, error: e.message });
                console.warn(`⚠️ generateShortLink 失敗（${p.id}）:`, e.message);
                return p;
            }
        }));

        // 取得實際賣場名稱
        const actualShops = [...new Set(products.map(p => p.shopName).filter(Boolean))];
        
        console.log(`✅ 成功處理 ${products.length} 個商品`);

        // 流量不大，不需要頻繁重打蝦皮 API，但特價有時效性，不能快取太久。
        // 1 小時：夠擋掉短時間內的重複請求，過期優惠最多掛著 1 小時就會被換掉。
        res.setHeader('Cache-Control', 'max-age=0, s-maxage=3600, stale-while-revalidate=1800');

        return res.status(200).json({
            products,
            count: products.length,
            source: shop ? `shop:${shop}` : `keyword:${keyword}`,
            actualShops: actualShops,
            // 這支函式真正被執行、重新去抓蝦皮資料的時間點。如果 Vercel 邊緣
            // 快取有生效，同一小時內連續打這支 API 應該會看到一模一樣的
            // fetchedAt；如果每次都不一樣，代表其實還是每次都真的重新抓。
            fetchedAt: new Date().toISOString(),
            // 暫時除錯用：確認 generateShortLink 是不是真的有換到新連結，
            // 還是失敗後默默退回原本的 offerLink。查完就拿掉。
            shortLinkDebug: req.query.debugShortLink ? shortLinkDebug : undefined
        });
        
    } catch (error) {
        console.error('❌ Shopee API 錯誤:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch products',
            message: error.message
        });
    }
};
