#!/bin/bash

# 更新廣告代碼為帶有本地開發檢測的版本
MONETAG_CODE='<!-- Monetag廣告代碼 -->
    <script>
        // 只在非本地環境中加載廣告
        if (!window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
            const script = document.createElement("script");
            script.src = "https://fpyf8.com/88/tag.min.js";
            script.setAttribute("data-zone", "148281");
            script.setAttribute("async", "");
            script.setAttribute("data-cfasync", "false");
            document.head.appendChild(script);
        }
    </script>'

# 簡化處理單個文件的函數
process_file() {
  local file=$1
  echo "處理文件: $file"
  
  # 移除舊的Monetag代碼或Google AdSense代碼
  sed -i '' '/<\!-- Monetag廣告代碼/,/<\/script>/d' "$file"
  sed -i '' '/google-adsense-account/d' "$file"
  sed -i '' '/adsbygoogle/d' "$file"
  
  # 在</head>前添加新的Monetag代碼
  sed -i '' 's@</head>@'"$MONETAG_CODE"'\n</head>@' "$file"
  
  echo "   已更新廣告代碼（增加本地環境檢測）"
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

# 處理index.html
process_file "index.html"

# 處理pages目錄
process_directory "pages"

# 處理game_result目錄下的所有seasons目錄
process_directory "game_result/season3"
process_directory "game_result/season4"

echo "完成！現在廣告只會在正式環境中顯示，本地開發時不會顯示廣告。" 