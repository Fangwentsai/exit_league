#!/bin/bash

# 新的簡化廣告代碼 - 直接使用用戶提供的代碼
NEW_CODE='<!-- Monetag廣告代碼 -->
    <script src="https://fpyf8.com/88/tag.min.js" data-zone="148281" async data-cfasync="false"></script>'

# 處理單個文件的函數
process_file() {
  local file=$1
  echo "處理文件: $file"
  
  # 備份原文件
  cp "$file" "${file}.bak"
  
  # 移除舊的Monetag代碼或Google AdSense代碼
  sed -i '' '/<\!-- Monetag廣告代碼/,/<\/script>/d' "$file"
  sed -i '' '/google-adsense-account/d' "$file"
  sed -i '' '/adsbygoogle/d' "$file"
  sed -i '' '/shaiwourtijogno\.net/d' "$file"
  
  # 在</head>前添加新的Monetag代碼
  sed -i '' 's@</head>@'"$NEW_CODE"'\\n</head>@' "$file"
  
  echo "   已更新廣告代碼"
}

# 處理指定目錄中的所有HTML文件
process_directory() {
  local directory=$1
  echo "處理目錄: $directory"
  
  # 獲取目錄中的所有HTML文件
  FILES=$(find "$directory" -name "*.html")
  
  for file in $FILES; do
    process_file "$file"
  done
}

# 先處理index.html，但只移除舊代碼而不添加新代碼
# 因為我們不想在框架頁面中加載廣告
echo "處理文件: index.html"
sed -i '' '/<\!-- Monetag廣告代碼/,/<\/script>/d' "index.html"
sed -i '' '/google-adsense-account/d' "index.html"
sed -i '' '/adsbygoogle/d' "index.html"
sed -i '' '/shaiwourtijogno\.net/d' "index.html"
echo "   已更新index.html (僅移除舊代碼)"

# 處理pages目錄
process_directory "pages"

# 處理game_result目錄下的所有seasons目錄
process_directory "game_result/season3"
process_directory "game_result/season4"

echo "完成更新！" 