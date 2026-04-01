/**
 * Shopee 商品輪播模組 - game_result 頁面專用
 * 動態從 /api/shopee-products 拉取商品（含 imageUrl）
 * Vercel 環境：顯示真實圖片；localhost：fallback 靜態資料 + SVG 佔位圖
 * Desktop 每頁 4 個 / Mobile 每頁 2 個
 */

(function () {
    'use strict';

    // ========== 主商品清單：以 CSV 為主，名稱/價格/推廣連結固定 ==========
    // shopId: 50984140 (AA darts Shop AsiA 飛鏢專賣店) — 更新自 item_0329.csv
    const csvProducts = [
        { id: 868804330,  name: 'Fit Point Plus 50入裝 [2BA]', price: 95, url: 'https://s.shopee.tw/10yYaMbYwq', productUrl: 'https://shopee.tw/product/50984140/868804330',  image: '' },
        { id: 2348639038,  name: 'TARGET PIXEL TIP 50入裝 [2BA]', price: 95, url: 'https://s.shopee.tw/1BHymfavbt', productUrl: 'https://shopee.tw/product/50984140/2348639038',  image: '' },
        { id: 903053372,  name: 'L-SHaft Lock Straight New Color 2020 塑膠/鎖桿(粗) 新顏色', price: 133, url: 'https://s.shopee.tw/gLiBkcpco', productUrl: 'https://shopee.tw/product/50984140/903053372',  image: '' },
        { id: 868833814,  name: 'L-style Premium Lippoint 30入裝 [2BA]', price: 133, url: 'https://s.shopee.tw/qf8O3cCHr', productUrl: 'https://shopee.tw/product/50984140/868833814',  image: '' },
        { id: 902648309,  name: 'Fit Flight AIR（薄鏢翼）3入裝 素色鏢翼 [Shape]', price: 142, url: 'https://s.shopee.tw/Lirn8e6Im', productUrl: 'https://shopee.tw/product/50984140/902648309',  image: '' },
        { id: 877015604,  name: 'Fit Flight AIR（薄鏢翼）3入裝 素色鏢翼 [Standard]', price: 142, url: 'https://s.shopee.tw/W2HzRdSxp', productUrl: 'https://shopee.tw/product/50984140/877015604',  image: '' },
        { id: 2707139645,  name: 'Fit Flight AIR（薄鏢翼）3入裝 素色鏢翼 [Kite]', price: 142, url: 'https://s.shopee.tw/161OWfMyk', productUrl: 'https://shopee.tw/product/50984140/2707139645',  image: '' },
        { id: 2514448015,  name: 'L-SHaft Lock Slim New Color 2020 塑膠/鎖桿(細) 新顏色', price: 133, url: 'https://s.shopee.tw/BPRapejdn', productUrl: 'https://shopee.tw/product/50984140/2514448015',  image: '' },
        { id: 2706954519,  name: 'Fit Flight AIR（薄鏢翼）3入裝 素色鏢翼 [Rocket]', price: 142, url: 'https://s.shopee.tw/2LTwAoWUFE', productUrl: 'https://shopee.tw/product/50984140/2706954519',  image: '' },
        { id: 883326787,  name: 'Fit Flight AIR（薄鏢翼）3入裝 素色鏢翼 [Super Shape]', price: 142, url: 'https://s.shopee.tw/2VnMN7VquH', productUrl: 'https://shopee.tw/product/50984140/883326787',  image: '' },
        { id: 2369457655,  name: 'L-style Premium Lippoint 30入裝 [No.5]', price: 152, url: 'https://s.shopee.tw/20r5mCXkvC', productUrl: 'https://shopee.tw/product/50984140/2369457655',  image: '' },
        { id: 16881530965,  name: 'L-style Premium Lippoint LONG 30入裝 [2BA]', price: 152, url: 'https://s.shopee.tw/2BAVyVX7aF', productUrl: 'https://shopee.tw/product/50984140/16881530965',  image: '' },
        { id: 905252508,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (White)', price: 161, url: 'https://s.shopee.tw/1gEFNaZ1bA', productUrl: 'https://shopee.tw/product/50984140/905252508',  image: '' },
        { id: 904946350,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Black)', price: 161, url: 'https://s.shopee.tw/1qXfZtYOGD', productUrl: 'https://shopee.tw/product/50984140/904946350',  image: '' },
        { id: 905256726,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Clear)', price: 161, url: 'https://s.shopee.tw/1LbOyyaIH8', productUrl: 'https://shopee.tw/product/50984140/905256726',  image: '' },
        { id: 7618124277,  name: 'Fit Flight Pro 素色鏢翼 [S-Type]', price: 161, url: 'https://s.shopee.tw/1VupBHZewB', productUrl: 'https://shopee.tw/product/50984140/7618124277',  image: '' },
        { id: 2425798231,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Black)', price: 161, url: 'https://s.shopee.tw/3fzJlGRPXc', productUrl: 'https://shopee.tw/product/50984140/2425798231',  image: '' },
        { id: 2420534054,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Clear)', price: 161, url: 'https://s.shopee.tw/3qIjxZQmCf', productUrl: 'https://shopee.tw/product/50984140/2420534054',  image: '' },
        { id: 905260763,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Light Blue)', price: 161, url: 'https://s.shopee.tw/3LMTMeSgDa', productUrl: 'https://shopee.tw/product/50984140/905260763',  image: '' },
        { id: 2425820787,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (White)', price: 161, url: 'https://s.shopee.tw/3VftYxS2sd', productUrl: 'https://shopee.tw/product/50984140/2425820787',  image: '' },
        { id: 905309016,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Purple)', price: 161, url: 'https://s.shopee.tw/30jcy2TwtY', productUrl: 'https://shopee.tw/product/50984140/905309016',  image: '' },
        { id: 2442306716,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Light Blue)', price: 161, url: 'https://s.shopee.tw/3B33ALTJYb', productUrl: 'https://shopee.tw/product/50984140/2442306716',  image: '' },
        { id: 905305969,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Pink)', price: 161, url: 'https://s.shopee.tw/2g6mZQVDZW', productUrl: 'https://shopee.tw/product/50984140/905305969',  image: '' },
        { id: 2425898929,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Purple)', price: 161, url: 'https://s.shopee.tw/2qQCljUaEZ', productUrl: 'https://shopee.tw/product/50984140/2425898929',  image: '' },
        { id: 2425955632,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Yellow)', price: 161, url: 'https://s.shopee.tw/50UhLiMKq0', productUrl: 'https://shopee.tw/product/50984140/2425955632',  image: '' },
        { id: 2425937250,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Green)', price: 161, url: 'https://s.shopee.tw/5Ao7Y1LhV3', productUrl: 'https://shopee.tw/product/50984140/2425937250',  image: '' },
        { id: 2420454232,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Yellow)', price: 161, url: 'https://s.shopee.tw/4frqx6NbVy', productUrl: 'https://shopee.tw/product/50984140/2420454232',  image: '' },
        { id: 905463560,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Red)', price: 161, url: 'https://s.shopee.tw/4qBH9PMyB1', productUrl: 'https://shopee.tw/product/50984140/905463560',  image: '' },
        { id: 905270211,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Green)', price: 161, url: 'https://s.shopee.tw/4LF0YUOsBw', productUrl: 'https://shopee.tw/product/50984140/905270211',  image: '' },
        { id: 905264850,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Deep Blue)', price: 161, url: 'https://s.shopee.tw/4VYQknOEqz', productUrl: 'https://shopee.tw/product/50984140/905264850',  image: '' },
        { id: 2425916103,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Orange)', price: 161, url: 'https://s.shopee.tw/40cA9sQ8ru', productUrl: 'https://shopee.tw/product/50984140/2425916103',  image: '' },
        { id: 2425977183,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Pink)', price: 161, url: 'https://s.shopee.tw/4AvaMBPVWx', productUrl: 'https://shopee.tw/product/50984140/2425977183',  image: '' },
        { id: 2425872807,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Red)', price: 161, url: 'https://s.shopee.tw/6L04wAHG8O', productUrl: 'https://shopee.tw/product/50984140/2425872807',  image: '' },
        { id: 2425848961,  name: 'Fit Shaft Gear Slim 塑膠/細桿 (Deep Blue)', price: 161, url: 'https://s.shopee.tw/6VJV8TGcnR', productUrl: 'https://shopee.tw/product/50984140/2425848961',  image: '' },
        { id: 905301884,  name: 'Fit Shaft Gear Normal 塑膠/粗桿 (Orange)', price: 161, url: 'https://s.shopee.tw/60NEXYIWoM', productUrl: 'https://shopee.tw/product/50984140/905301884',  image: '' },
        { id: 28772185613,  name: 'FIDNS Runic Wing [Standard]', price: 171, url: 'https://s.shopee.tw/6AgejrHtTP', productUrl: 'https://shopee.tw/product/50984140/28772185613',  image: '' },
        { id: 22041383321,  name: '尾翼 Fit Flight(厚鏢翼) 柴崎晋之介 選手款鏢翼 [Shape]', price: 180, url: 'https://s.shopee.tw/5fkO8wJnUK', productUrl: 'https://shopee.tw/product/50984140/22041383321',  image: '' },
        { id: 5341669228,  name: 'NATURAL 9 L-style Premium Lippoint 漸層白 30入裝 [2BA]', price: 180, url: 'https://s.shopee.tw/5q3oLFJA9N', productUrl: 'https://shopee.tw/product/50984140/5341669228',  image: '' },
        { id: 3646364160,  name: 'NATURAL 9 L-style Premium Lippoint 漸層黑 30入裝 [2BA]', price: 180, url: 'https://s.shopee.tw/5L7XkKL4AI', productUrl: 'https://shopee.tw/product/50984140/3646364160',  image: '' },
        { id: 24635530101,  name: 'Fit Flight (厚鏢翼) 普波騰列 ver.4 選手款 [Shape]', price: 180, url: 'https://s.shopee.tw/5VQxwdKQpL', productUrl: 'https://shopee.tw/product/50984140/24635530101',  image: '' },
        { id: 43260659851,  name: 'Fit Flight (厚鏢翼) 岡本彩花 ver.1 選手款 [Shape]', price: 180, url: 'https://s.shopee.tw/7fVSWcCBQm', productUrl: 'https://shopee.tw/product/50984140/43260659851',  image: '' },
        { id: 43466870823,  name: 'Fit Flight (厚鏢翼) 大城正樹 ver.6 選手款 [Shape]', price: 180, url: 'https://s.shopee.tw/7posivBY5p', productUrl: 'https://shopee.tw/product/50984140/43466870823',  image: '' },
        { id: 40076057504,  name: 'Fit Flight (厚鏢翼) 小宮山亞美 ver.3 選手款 [Shape]', price: 180, url: 'https://s.shopee.tw/7Ksc80DS6k', productUrl: 'https://shopee.tw/product/50984140/40076057504',  image: '' },
        { id: 28401605877,  name: 'Fit Flight (厚鏢翼) Cheeks [Standard/Shape]', price: 180, url: 'https://s.shopee.tw/7VC2KJColn', productUrl: 'https://shopee.tw/product/50984140/28401605877',  image: '' },
        { id: 47505872379,  name: 'Fit Flight (厚鏢翼) 荏隈秀一 ver.3 選手款 [Shape]', price: 180, url: 'https://s.shopee.tw/70FljOEimi', productUrl: 'https://shopee.tw/product/50984140/47505872379',  image: '' },
        { id: 45350619951,  name: 'Fit Flight (厚鏢翼) Terry Tan ver.1 選手款 [Shape/Rocket]', price: 180, url: 'https://s.shopee.tw/7AZBvhE5Rl', productUrl: 'https://shopee.tw/product/50984140/45350619951',  image: '' },
        { id: 56354040771,  name: 'Fit Flight (厚鏢翼) Eddie Thien ver.1 選手款 [Shape]', price: 189, url: 'https://s.shopee.tw/6fcvKmFzSg', productUrl: 'https://shopee.tw/product/50984140/56354040771',  image: '' },
        { id: 848467167,  name: 'Fit Flight（厚鏢翼）素色鏢翼 6入裝 [Shape]', price: 190, url: 'https://s.shopee.tw/6pwLX5FM7j', productUrl: 'https://shopee.tw/product/50984140/848467167',  image: '' },
        { id: 24481606486,  name: 'Fit Flight (厚鏢翼) 柴崎晋之介 Ver.2 選手款 [Shape]', price: 189, url: 'https://s.shopee.tw/900q7476jA', productUrl: 'https://shopee.tw/product/50984140/24481606486',  image: '' },
        { id: 897027059,  name: 'Fit Flight（厚鏢翼）素色鏢翼 6入裝 [Standard]', price: 190, url: 'https://s.shopee.tw/9AKGJN6TOD', productUrl: 'https://shopee.tw/product/50984140/897027059',  image: '' },
        { id: 2706922758,  name: 'Fit Flight（厚鏢翼）素色鏢翼 6入裝 [Rocket]', price: 190, url: 'https://s.shopee.tw/8fNziS8NP8', productUrl: 'https://shopee.tw/product/50984140/2706922758',  image: '' },
        { id: 56953274464,  name: 'Fit Flight (厚鏢翼) Cock-a-doodle-doo (咕咕咕) [Shape]', price: 190, url: 'https://s.shopee.tw/8phPul7k4B', productUrl: 'https://shopee.tw/product/50984140/56953274464',  image: '' },
        { id: 55853278874,  name: 'Fit Flight (厚鏢翼) D.CRAFT SnowwwMan (雪人) [Shape]', price: 190, url: 'https://s.shopee.tw/8Kl9Jq9e56', productUrl: 'https://shopee.tw/product/50984140/55853278874',  image: '' },
        { id: 22169278491,  name: '尾翼 Fit Flight(厚鏢翼) D.CRAFT Tuna 鮪魚壽司 [Shape]', price: 190, url: 'https://s.shopee.tw/8V4ZW990k9', productUrl: 'https://shopee.tw/product/50984140/22169278491',  image: '' },
        { id: 53353274490,  name: 'Fit Flight (厚鏢翼) D.CRAFT Pudding (布丁) [Shape]', price: 190, url: 'https://s.shopee.tw/808IvEAul4', productUrl: 'https://shopee.tw/product/50984140/53353274490',  image: '' },
        { id: 46507244922,  name: 'Fit Flight (厚鏢翼) GLIMSTER YUKICHI 諭吉 [Shape]', price: 209, url: 'https://s.shopee.tw/8ARj7XAHQ7', productUrl: 'https://shopee.tw/product/50984140/46507244922',  image: '' },
        { id: 28359853380,  name: 'Fit Flight AIR (薄鏢翼) 普波騰列 ver.4 選手款 [Shape]', price: 218, url: 'https://s.shopee.tw/AKWDhW221Y', productUrl: 'https://shopee.tw/product/50984140/28359853380',  image: '' },
        { id: 20988370133,  name: '尾翼 Fit Flight AIR(薄鏢翼) 柴崎晋之介 選手款鏢翼 [Shape]', price: 218, url: 'https://s.shopee.tw/AUpdtp1Ogb', productUrl: 'https://shopee.tw/product/50984140/20988370133',  image: '' },
        { id: 57255852356,  name: 'Fit Flight AIR (薄鏢翼) 荏隈秀一 ver.3 選手款 [Shape]', price: 218, url: 'https://s.shopee.tw/9ztNIu3IhW', productUrl: 'https://shopee.tw/product/50984140/57255852356',  image: '' },
        { id: 29613894594,  name: 'TARGET K-FLEX NEON 素色一體式鏢翼 [Shape]', price: 247, url: 'https://s.shopee.tw/AACnVD2fMZ', productUrl: 'https://shopee.tw/product/50984140/29613894594',  image: '' },
        { id: 25027147618,  name: 'TARGET K-FLEX 素色一體式鏢翼 [Standard]', price: 247, url: 'https://s.shopee.tw/9fGWuI4ZNU', productUrl: 'https://shopee.tw/product/50984140/25027147618',  image: '' },
        { id: 24443888804,  name: '【限定】K-FLEX TARGET JAPAN Logo [Shape]', price: 247, url: 'https://s.shopee.tw/9pZx6b3w2X', productUrl: 'https://shopee.tw/product/50984140/24443888804',  image: '' },
        { id: 20195963128,  name: 'TARGET K-FLEX RGB Series 一體式素色鏢翼 [Shape]', price: 247, url: 'https://s.shopee.tw/9KdgVg5q3S', productUrl: 'https://shopee.tw/product/50984140/20195963128',  image: '' },
        { id: 28524447808,  name: '【限定】K-FLEX TARGET JAPAN Logo [Standard]', price: 247, url: 'https://s.shopee.tw/9Ux6hz5CiV', productUrl: 'https://shopee.tw/product/50984140/28524447808',  image: '' },
        { id: 25877147858,  name: 'TARGET K-FLEX RGB Series 一體式素色鏢翼 [Standard]', price: 247, url: 'https://s.shopee.tw/1BHymfavcu', productUrl: 'https://shopee.tw/product/50984140/25877147858',  image: '' },
        { id: 27963910077,  name: 'TARGET K-FLEX NEON 素色一體式鏢翼 [Standard]', price: 247, url: 'https://s.shopee.tw/10yYaMbYxt', productUrl: 'https://shopee.tw/product/50984140/27963910077',  image: '' },
        { id: 15799518815,  name: 'TARGET K-FLEX 素色一體式尾翼 [Shape]', price: 247, url: 'https://s.shopee.tw/qf8O3cCIs', productUrl: 'https://shopee.tw/product/50984140/15799518815',  image: '' },
        { id: 28328788075,  name: 'TARGET SCREAM K-FLEX 山形明人 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/gLiBkcpdr', productUrl: 'https://shopee.tw/product/50984140/28328788075',  image: '' },
        { id: 55852291617,  name: 'TARGET RISING SUN 2025 K-FLEX 村松治樹 選手款 [Standard]', price: 313, url: 'https://s.shopee.tw/W2HzRdSyq', productUrl: 'https://shopee.tw/product/50984140/55852291617',  image: '' },
        { id: 44267475643,  name: 'TARGET LEGEND K-FLEX Paul Lim 選手款 [Standard]', price: 313, url: 'https://s.shopee.tw/Lirn8e6Jp', productUrl: 'https://shopee.tw/product/50984140/44267475643',  image: '' },
        { id: 41967473950,  name: 'TARGET LEGEND K-FLEX Paul Lim 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/BPRapejeo', productUrl: 'https://shopee.tw/product/50984140/41967473950',  image: '' },
        { id: 26477776163,  name: 'TARGET CHARIS K-FLEX 梁雨恩 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/161OWfMzn', productUrl: 'https://shopee.tw/product/50984140/26477776163',  image: '' },
        { id: 45351194233,  name: 'TARGET CHARIS 2025 K-FLEX 梁雨恩 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/2VnMN7VqvI', productUrl: 'https://shopee.tw/product/50984140/45351194233',  image: '' },
        { id: 25591111422,  name: 'TARGET DIAMOND K-FLEX いわお小鈴 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/2LTwAoWUGH', productUrl: 'https://shopee.tw/product/50984140/25591111422',  image: '' },
        { id: 29159081720,  name: 'TARGET RISING SUN K-FLEX 村松治樹 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/2BAVyVX7bG', productUrl: 'https://shopee.tw/product/50984140/29159081720',  image: '' },
        { id: 29627776375,  name: 'TARGET PYRO K-FLEX 星野光正 選手款 [Standard]', price: 313, url: 'https://s.shopee.tw/20r5mCXkwF', productUrl: 'https://shopee.tw/product/50984140/29627776375',  image: '' },
        { id: 28969069187,  name: 'TARGET ZENITH K-FLEX Tung Suk 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/1qXfZtYOHE', productUrl: 'https://shopee.tw/product/50984140/28969069187',  image: '' },
        { id: 46951204056,  name: 'TARGET CHARIS 2025 K-FLEX 梁雨恩 選手款 [Standard]', price: 313, url: 'https://s.shopee.tw/1gEFNaZ1cD', productUrl: 'https://shopee.tw/product/50984140/46951204056',  image: '' },
        { id: 40226851472,  name: 'TARGET RISING SUN 2025 K-FLEX 村松治樹 選手款 [Shape]', price: 313, url: 'https://s.shopee.tw/1VupBHZexC', productUrl: 'https://shopee.tw/product/50984140/40226851472',  image: '' },
        { id: 24212885991,  name: 'TRiNiDAD CONDOR AXE Neon Series 素色一體式鏢翼 [Standard]', price: 361, url: 'https://s.shopee.tw/1LbOyyaIIB', productUrl: 'https://shopee.tw/product/50984140/24212885991',  image: '' },
        { id: 43071669641,  name: 'TRiNiDAD CONDOR AXE 120 [TearDrop]', price: 361, url: 'https://s.shopee.tw/3qIjxZQmDg', productUrl: 'https://shopee.tw/product/50984140/43071669641',  image: '' },
        { id: 27682054433,  name: 'TRiNiDAD CONDOR AXE 素色一體式鏢翼 [Standard]', price: 361, url: 'https://s.shopee.tw/3fzJlGRPYf', productUrl: 'https://shopee.tw/product/50984140/27682054433',  image: '' },
        { id: 43251311125,  name: 'TRiNiDAD CONDOR AXE 120 [Narrow]', price: 361, url: 'https://s.shopee.tw/3VftYxS2te', productUrl: 'https://shopee.tw/product/50984140/43251311125',  image: '' },
        { id: 22017102420,  name: 'TRiNiDAD CONDOR AXE Neon Series 素色一體式鏢翼 [Shape]', price: 361, url: 'https://s.shopee.tw/3LMTMeSgEd', productUrl: 'https://shopee.tw/product/50984140/22017102420',  image: '' },
        { id: 25543546477,  name: 'TRiNiDAD CONDOR AXE 素色一體式鏢翼 [Shape]', price: 361, url: 'https://s.shopee.tw/3B33ALTJZc', productUrl: 'https://shopee.tw/product/50984140/25543546477',  image: '' },
        { id: 27115891616,  name: 'TRiNiDAD CONDOR AXE 120 素色一體式鏢翼 [Shape]', price: 361, url: 'https://s.shopee.tw/30jcy2Twub', productUrl: 'https://shopee.tw/product/50984140/27115891616',  image: '' },
        { id: 22824953574,  name: 'TRiNiDAD CONDOR AXE 素色一體式鏢翼 [WingSlim]', price: 361, url: 'https://s.shopee.tw/2qQCljUaFa', productUrl: 'https://shopee.tw/product/50984140/22824953574',  image: '' },
        { id: 24827144653,  name: 'TRiNiDAD CONDOR AXE 120 素色一體式鏢翼 [Standard]', price: 361, url: 'https://s.shopee.tw/2g6mZQVDaZ', productUrl: 'https://shopee.tw/product/50984140/24827144653',  image: '' },
        { id: 55807234385,  name: 'TRiNiDAD CONDOR AXE 120 [Slim]', price: 361, url: 'https://s.shopee.tw/5Ao7Y1LhW4', productUrl: 'https://shopee.tw/product/50984140/55807234385',  image: '' },
        { id: 26727748539,  name: 'TARGET HOT SHOT K-FLEX Harith Lim 選手款 [Standard]', price: 370, url: 'https://s.shopee.tw/50UhLiMKr3', productUrl: 'https://shopee.tw/product/50984140/26727748539',  image: '' },
        { id: 43160350080,  name: 'TRiNiDAD CONDOR AXE 金鯱 中西永吉 選手款 [Standard]', price: 380, url: 'https://s.shopee.tw/4qBH9PMyC2', productUrl: 'https://shopee.tw/product/50984140/43160350080',  image: '' },
        { id: 41307324692,  name: 'TRiNiDAD CONDOR AXE THUNDER BITE 宮脇実由 選手款[Standard]', price: 380, url: 'https://s.shopee.tw/4frqx6NbX1', productUrl: 'https://shopee.tw/product/50984140/41307324692',  image: '' },
        { id: 41679371759,  name: 'CONDOR AXE FRIETE Stefaan Henderyck 選手款 [Standard]', price: 380, url: 'https://s.shopee.tw/4VYQknOEs0', productUrl: 'https://shopee.tw/product/50984140/41679371759',  image: '' },
        { id: 29538347276,  name: 'TRiNiDAD CONDOR AXE THUNDER BITE 宮脇実由 選手款 [Shape]', price: 380, url: 'https://s.shopee.tw/4LF0YUOsCz', productUrl: 'https://shopee.tw/product/50984140/29538347276',  image: '' },
        { id: 26891412056,  name: 'TRiNiDAD CONDOR AXE 桔梗の花 岩田夏海 選手款 [Standard]', price: 380, url: 'https://s.shopee.tw/4AvaMBPVXy', productUrl: 'https://shopee.tw/product/50984140/26891412056',  image: '' },
        { id: 41764350913,  name: 'TRiNiDAD CONDOR AXE BIG RIG 2 Ben Robb 選手款 [Shape]', price: 380, url: 'https://s.shopee.tw/40cA9sQ8sx', productUrl: 'https://shopee.tw/product/50984140/41764350913',  image: '' },
        { id: 43414343198,  name: 'CONDOR AXE G.T.MONSTER Inspiration3 後藤智弥 選手款[Shape]', price: 380, url: 'https://s.shopee.tw/6VJV8TGcoS', productUrl: 'https://shopee.tw/product/50984140/43414343198',  image: '' },
        { id: 28793216108,  name: 'TRiNiDAD CONDOR AXE T-V Timothy Verbrugghe 選手款 [Sta', price: 380, url: 'https://s.shopee.tw/6L04wAHG9R', productUrl: 'https://shopee.tw/product/50984140/28793216108',  image: '' },
        { id: 41760348422,  name: 'TRiNiDAD CONDOR AXE 120 金鯱 中西永吉 選手款 [Standard]', price: 380, url: 'https://s.shopee.tw/6AgejrHtUQ', productUrl: 'https://shopee.tw/product/50984140/41760348422',  image: '' },
        { id: 27662083667,  name: 'TRiNiDAD CONDOR AXE 和炎 WA‧EN 山田勇樹 選手款 [Shape]', price: 380, url: 'https://s.shopee.tw/60NEXYIWpP', productUrl: 'https://shopee.tw/product/50984140/27662083667',  image: '' },
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

        // 加入進度條動畫
        track.innerHTML = `
            <div style="width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; height:150px; padding:0 20px; box-sizing:border-box;">
                <div style="color:#EE4D2D; font-size:14px; font-weight:bold; letter-spacing:1px; margin-bottom:12px; display:flex; align-items:center;">
                    <span style="margin-right:8px;">正在為您準備專屬推薦...</span>
                    <span id="shopee-game-progress-text" style="min-width:30px; text-align:right;">0%</span>
                </div>
                <div style="width:100%; max-width:280px; height:8px; background-color:#ffe6e0; border-radius:4px; overflow:hidden;">
                    <div id="shopee-game-progress-bar" style="width:0%; height:100%; background-color:#EE4D2D; border-radius:4px; transition: width 0.2s ease;"></div>
                </div>
            </div>
        `;

        // 模擬進度推進
        let simProgress = 0;
        const progressTimer = setInterval(() => {
            if (simProgress < 95) {
                // 越後面跑越慢
                const step = Math.max(1, (95 - simProgress) / 5 * Math.random());
                simProgress += step;
                if (simProgress > 95) simProgress = 95;
                const progressText = document.getElementById('shopee-game-progress-text');
                const progressBar = document.getElementById('shopee-game-progress-bar');
                if (progressText) progressText.innerText = Math.floor(simProgress) + '%';
                if (progressBar) progressBar.style.width = simProgress + '%';
            }
        }, 150);

        // 真隨機載入法 (放棄快取，追求第一頁滿圖且全亂數)
        // 1. 先將 58 個商品全局洗牌
        shuffled = shuffle([...csvProducts]);
        
        // 2. 擷取洗牌後的前 12 個與後 46 個
        const batch1 = shuffled.slice(0, 12);
        const batch2 = shuffled.slice(12);

        // 同時發出請求（因為網址每次隨機，快取將失效，約等 1~1.5 秒）
        const p1 = fetchImagesForBatch(batch1);
        const p2 = fetchImagesForBatch(batch2);

        // 只等待第一批 (也就是畫面上最前面的 12 個) 處理完，即刻渲染畫面
        await p1;
        
        // 載入完成，直接推滿進度條
        clearInterval(progressTimer);
        const progressText = document.getElementById('shopee-game-progress-text');
        const progressBar = document.getElementById('shopee-game-progress-bar');
        if (progressText) progressText.innerText = '100%';
        if (progressBar) progressBar.style.width = '100%';

        // 稍微延遲讓用戶看到 100% 滿了，避免瞬間切換太突兀
        await new Promise(r => setTimeout(r, 250));
        
        // 渲染 (前 12 個保證有圖，後 46 個暫時為 SVG)
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
        // 取頁面檔名當 sub_id，例如 /game_result/season5/g49.html → g49
        const pageSlug = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
        track.innerHTML = shuffled.map((p, i) => {
            const img = p.image || placeholderImg(p.name, i);
            const urlWithSubId = p.url + (p.url.includes('?') ? '&' : '?') + 'sub_id=' + pageSlug;
            return `<a href="${urlWithSubId}" target="_blank" rel="noopener noreferrer" class="shopee-game-card" onclick="if(window.gtag) gtag('event', 'click_shopee_product', { 'event_category': 'Shopee', 'event_label': '${p.name.replace(/'/g, "\\'")}', 'shopee_url': '${urlWithSubId}', 'page_source': window.location.pathname });">
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
