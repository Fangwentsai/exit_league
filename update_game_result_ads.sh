#!/bin/bash

# 設定新的廣告代碼
NEW_CODE='    <script>(function(d,z,s){s.src='\''https://'\''+'\''+d+'\''+'\''/'\''+'\''401/'\''+'\''+'\''+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('\''gizokraijaw.net'\'',9352320,document.createElement('\''script'\''))</script>'

# 查找game_result目錄下的所有HTML文件
find game_result -name "*.html" -type f | while read file; do
  echo "處理: $file"
  
  # 創建臨時文件
  tmp_file="${file}.tmp"
  
  # 將檔案內容讀取到變數
  content=$(cat "$file")
  
  # 檢查檔案是否包含舊的Monetag廣告代碼
  if grep -q "Monetag廣告代碼" "$file"; then
    # 使用awk處理檔案，找到舊的廣告代碼行並替換
    awk '
      BEGIN { found = 0; }
      /<!-- Monetag廣告代碼/ { 
        found = 1; 
        print "<!-- Monetag廣告代碼 -->";
        print "'"$NEW_CODE"'";
        next; 
      }
      found == 1 && /<\/script>/ { 
        found = 0; 
        next; 
      }
      found == 0 { print $0; }
    ' "$file" > "$tmp_file"
    
    # 將臨時文件移動到原始文件
    mv "$tmp_file" "$file"
  else
    # 如果沒有找到舊代碼，則嘗試在</head>前添加新代碼
    if grep -q "</head>" "$file"; then
      awk '
        /<\/head>/ { 
          print "<!-- Monetag廣告代碼 -->";
          print "'"$NEW_CODE"'";
          print $0;
          next;
        }
        { print $0; }
      ' "$file" > "$tmp_file"
      
      # 將臨時文件移動到原始文件
      mv "$tmp_file" "$file"
    else
      echo "警告: $file 沒有找到 </head> 標籤，跳過處理"
    fi
  fi
done

echo "所有game_result目錄下的廣告代碼已更新完成！" 