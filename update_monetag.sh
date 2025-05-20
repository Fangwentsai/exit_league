#!/bin/bash

# 新的廣告代碼
NEW_CODE='<!-- Monetag廣告代碼 -->
    <script src="https://fpyf8.com/88/tag.min.js" data-zone="148281" async data-cfasync="false"></script>'

# 處理一個文件
update_file() {
  local file="$1"
  local temp_file="${file}.temp"
  local add_code=true
  
  echo "處理文件: $file"
  
  # 如果是index.html，則不添加廣告代碼
  if [[ "$file" == "index.html" ]]; then
    add_code=false
  fi
  
  # 使用awk處理文件
  awk -v new_code="$NEW_CODE" -v add_code="$add_code" '
    # 刪除舊的Monetag代碼
    /<!-- Monetag廣告代碼/ { skip = 1; next }
    /<\/script>/ { if (skip) { skip = 0; next } }
    skip { next }
    
    # 刪除Google AdSense代碼
    /google-adsense-account/ { next }
    /adsbygoogle/ { next }
    /shaiwourtijogno/ { next }
    
    # 在</head>前添加新代碼
    /<\/head>/ { if (add_code == "true") print new_code; print; next }
    
    # 打印其他行
    { print }
  ' "$file" > "$temp_file" && mv "$temp_file" "$file"
}

# 處理目錄中的所有HTML文件
process_dir() {
  local dir="$1"
  for file in "$dir"/*.html; do
    if [ -f "$file" ]; then
      update_file "$file"
    fi
  done
}

# 處理主目錄的HTML文件
for file in *.html; do
  if [ -f "$file" ]; then
    update_file "$file"
  fi
done

# 處理pages目錄
if [ -d "pages" ]; then
  process_dir "pages"
fi

# 處理game_result目錄下的所有seasons目錄
if [ -d "game_result/season3" ]; then
  process_dir "game_result/season3"
fi

if [ -d "game_result/season4" ]; then
  process_dir "game_result/season4"
fi

echo "廣告代碼更新完成！" 