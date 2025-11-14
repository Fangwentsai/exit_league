# 開發環境 (dev.yhdarts.com)

這是難找的聯賽的開發測試環境。

## 目的
- 測試新功能
- 開發新的後台系統
- 不影響正式環境 (yhdarts.com)

## 環境說明
- **正式環境**: yhdarts.com (main 分支)
- **開發環境**: dev.yhdarts.com (dev 分支)

## 部署方式
1. 在 dev 分支開發和測試
2. 測試完成後 merge 到 main 分支
3. GitHub Pages 會自動部署

## 注意事項
- 開發環境可以隨意測試，不用擔心影響正式站
- 記得定期從 main 分支 pull 最新變更
- 測試完成的功能要 merge 回 main

## DNS 設定
確保你的 DNS 有設定：
```
類型: CNAME
名稱: dev
值: <你的 GitHub Pages 網址>
```

