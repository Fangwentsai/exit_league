# WebP 圖片轉換完整清單

## 📦 需要上傳的 WebP 檔案

### ✅ 已更新代碼的圖片

#### 1. Season 4 輪播照片（6 張）
```
/images/award/season4/
  ├── IMG_9918.webp  (原 343 KB → 預計 ~130 KB)
  ├── IMG_9919.webp
  ├── IMG_9920.webp
  ├── IMG_9921.webp
  ├── IMG_9922.webp
  └── IMG_9923.webp
```

#### 2. Season 3 照片（7 張）
```
/images/award/season3/
  ├── IMG_9924.webp
  ├── IMG_9925.webp
  ├── IMG_9926.webp
  ├── IMG_9927.webp
  ├── IMG_9928.webp
  ├── IMG_9929.webp
  └── IMG_9930.webp
```

#### 3. Season 2 照片（3 張）
```
/images/award/season2/
  ├── IMG_9931.webp
  ├── IMG_9932.webp
  └── IMG_9933.webp
```

#### 4. Banner 圖片
```
/images/
  ├── banner.webp       (原 142 KB → 預計 ~60 KB)
  ├── banner_s4.webp
  └── season5.webp      (已完成)
```

#### 5. 其他圖片
```
/images/
  ├── agan.webp         (已完成)
  └── playoffs.webp     (原 14 KB → 預計 ~7 KB)
```

## 📁 已更新的檔案清單

### JavaScript 檔案
1. ✅ `js/main.js`
   - 輪播圖片陣列（season4Images）
   - Awards 頁面檔案檢查（knownFiles - 2 處）
   - 共用圖片（commonImages - banner.webp）

### HTML 檔案
1. ✅ `index.html`
   - og:image meta 標籤
   - twitter:image meta 標籤
   - JSON-LD logo

2. ✅ `pages/news.html`
   - 輪播圖片預載入
   - agan.webp
   - playoffs.webp

3. ✅ `pages/schedule.html`
   - banner.webp

4. ✅ `pages/scheduleS4.html`
   - banner_s4.webp

5. ✅ `pages/scheduleS5.html`
   - season5.webp

## 📊 預期節省空間

### 已計算的檔案大小

| 檔案 | JPG/PNG | WebP | 節省 |
|------|---------|------|------|
| IMG_9918.JPG | 343 KB | ~130 KB | -62% |
| banner.png | 142 KB | ~60 KB | -58% |
| playoffs.png | 14 KB | ~7 KB | -50% |
| **Season 4 全部（6張）** | ~2,058 KB | ~780 KB | **-1,278 KB** |
| **Season 3 全部（7張）** | ~2,401 KB | ~910 KB | **-1,491 KB** |
| **Season 2 全部（3張）** | ~1,029 KB | ~390 KB | **-639 KB** |

### 總計節省
```
總原始大小：~5.5 MB
WebP 大小：  ~2.2 MB
節省空間：   ~3.3 MB (60%)
```

## 🎯 轉換指令參考

### 批次轉換 Season 照片
```bash
# 進入目錄
cd images/award/season4/

# 批次轉換（品質 80）
for file in *.JPG; do
    cwebp -q 80 "$file" -o "${file%.JPG}.webp"
done

# 或使用品質 85（更高品質）
for file in *.JPG; do
    cwebp -q 85 "$file" -o "${file%.JPG}.webp"
done
```

### 單獨轉換 PNG
```bash
# banner.png
cwebp -q 90 images/banner.png -o images/banner.webp

# banner_s4.png
cwebp -q 90 images/banner_s4.png -o images/banner_s4.webp

# playoffs.png
cwebp -q 85 images/playoffs.png -o images/playoffs.webp
```

### 線上工具
如果沒有 cwebp 工具，可以使用：
- **Squoosh.app** - https://squoosh.app/
- **CloudConvert** - https://cloudconvert.com/png-to-webp
- **TinyPNG** - https://tinypng.com/ (也支援 WebP)

## ✅ 上傳檢查清單

### 第一優先（首頁和新聞頁使用）
- [ ] `/images/award/season4/IMG_9918.webp` 至 `IMG_9923.webp` (6 張)
- [ ] `/images/banner.webp`
- [ ] `/images/agan.webp` ✅ (應該已上傳)
- [ ] `/images/season5.webp` ✅ (應該已上傳)
- [ ] `/images/playoffs.webp`

### 第二優先（Awards 頁面使用）
- [ ] `/images/award/season3/` 全部 7 張 webp
- [ ] `/images/award/season2/` 全部 3 張 webp
- [ ] `/images/banner_s4.webp`

## 🧪 測試步驟

### 1. 上傳後測試
```bash
# 測試 Season 4 第一張圖片是否存在
curl -I https://yhdarts.com/images/award/season4/IMG_9918.webp

# 應該返回 200 OK
```

### 2. 瀏覽器測試
1. 開啟 https://yhdarts.com
2. 按 F12 打開開發者工具
3. 切換到 Network 標籤
4. 篩選 "Img"
5. 重新載入頁面
6. 確認：
   - ✅ 載入的是 .webp 檔案
   - ✅ 沒有 .JPG 或 .PNG (banner, playoffs)
   - ✅ 檔案大小明顯減少

### 3. 功能測試
- [ ] 首頁輪播照片正常顯示
- [ ] news.html 輪播照片正常
- [ ] news.html 阿淦幣圖片正常
- [ ] news.html 季後賽對戰表正常
- [ ] scheduleS5.html banner 正常
- [ ] schedule.html banner 正常
- [ ] scheduleS4.html banner 正常
- [ ] Awards 頁面照片正常顯示

## 📊 預期性能改善

### 頁面載入改善

| 頁面 | 優化前 | 優化後 | 改善 |
|-----|-------|-------|-----|
| **首頁** | ~2.5 MB | ~1.2 MB | -52% |
| **news.html** | ~3.0 MB | ~1.3 MB | -57% |
| **Awards** | ~5.5 MB | ~2.2 MB | -60% |

### Lighthouse 指標預期

```
LCP 改善：
- 目前：8.2s
- 預期：3.5-4.0s
- 改善：-50%

總體效能分數：
- 目前：29
- 預期：75-85
- 改善：+160%
```

## ⚠️ 注意事項

### 1. 保留原始檔案
上傳 WebP 後，建議暫時保留原始 JPG/PNG 檔案：
- 作為備份
- 某些舊瀏覽器可能不支援 WebP
- 可以稍後再刪除

### 2. CDN 快取清除
如果使用 CDN (如 Cloudflare)：
- 上傳後需要清除快取
- 確保用戶看到新的 WebP 圖片

### 3. 瀏覽器兼容性
WebP 支援度：
- ✅ Chrome 32+
- ✅ Firefox 65+
- ✅ Safari 14+
- ✅ Edge 18+
- 覆蓋率：>95%

對於不支援的瀏覽器，可以考慮添加 `<picture>` 標籤：
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="...">
</picture>
```

## 🎉 完成狀態

### 代碼更新
✅ 所有代碼已更新完成

### 待完成
⏳ 上傳 WebP 檔案到伺服器

### 預期效果
一旦上傳完成：
- 🚀 頁面載入速度提升 50-60%
- 📉 帶寬使用減少 60%
- ⚡ LCP 改善約 4 秒
- 🎯 效能分數提升至 75-85

---

**更新日期**：2025/12/01  
**狀態**：代碼已更新，等待 WebP 檔案上傳

