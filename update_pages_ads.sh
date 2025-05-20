#!/bin/bash

# 新的廣告代碼
NEW_CODE='    <script>(function(d,z,s){s.src="https://"+d+"/401/"+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})("gizokraijaw.net",9352320,document.createElement("script"))</script>'

# 查找pages目錄下的所有HTML文件
find pages -name "*.html" -type f | while read file; do
  echo "處理: $file"
  
  # 創建一個臨時文件
  tmp_file="${file}.tmp"
  
  # 檢查文件是否包含舊的Monetag代碼標記
  if grep -q "Monetag廣告代碼" "$file"; then
    # 使用sed進行替換，直接替換整個廣告代碼段落
    cat "$file" | sed -e '/<!-- Monetag廣告代碼/,/<\/script>/c\
<!-- Monetag廣告代碼 -->\
'"$NEW_CODE"'' > "$tmp_file"
    
    # 移動臨時文件替換原始文件
    mv "$tmp_file" "$file"
  else
    echo "警告: $file 中沒有找到Monetag廣告代碼標記，跳過處理"
  fi
done

echo "所有pages目錄下的HTML文件廣告代碼已更新！" 