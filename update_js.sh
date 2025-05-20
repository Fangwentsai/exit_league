#!/bin/bash

# 新的JS代碼
NEW_SCRIPT='<script src="https://fpyf8.com/88/tag.min.js" data-zone="148281" async data-cfasync="false"></script>'

# 遍歷所有HTML文件
find . -name "*.html" | while read file; do
  echo "處理 $file"
  
  # 備份原文件
  cp "$file" "${file}.orig"
  
  # 移除所有舊的廣告代碼 (包括Monetag和Google AdSense)
  # 1. 刪除包含"Monetag廣告代碼"的整個代碼塊
  sed -i.bak '/<\!-- Monetag廣告代碼/,/<\/script>/d' "$file"
  
  # 2. 刪除Google AdSense相關代碼
  sed -i.bak '/google-adsense-account/d' "$file"
  sed -i.bak '/adsbygoogle/d' "$file"
  sed -i.bak '/shaiwourtijogno/d' "$file"
  
  # 在index.html中不添加新代碼
  if [[ "$file" != "./index.html" ]]; then
    # 在</head>前添加新的廣告代碼
    sed -i.bak "s|</head>|<!-- Monetag廣告代碼 -->\n    $NEW_SCRIPT\n</head>|" "$file"
  fi
done

# 刪除所有備份文件
find . -name "*.bak" -delete

echo "所有文件已更新完成" 