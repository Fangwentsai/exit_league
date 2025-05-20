#!/bin/bash

# 創建一個臨時文件，包含要替換的Monetag代碼
cat > monetag_code.txt << 'EOF'
<!-- Monetag廣告代碼 -->
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
    </script>
EOF

# 處理函數，使用awk來處理文件
process_file() {
  local file=$1
  echo "處理文件: $file"
  
  # 備份原文件
  cp "$file" "${file}.bak"
  
  # 使用awk進行處理，主要思路：
  # 1. 如果找到<!-- Monetag廣告代碼 -->行，將它和後續行（直到</script>）刪除，並加上新代碼
  # 2. 如果找到google-adsense-account相關行，刪除它們
  # 3. 如果文件中沒有廣告代碼，在</head>前添加新代碼
  awk '
    BEGIN { 
      adCodeFound = 0 
      googleAdsFound = 0
      newCodeFile = "monetag_code.txt"
      # 讀取新代碼
      getline newCode < newCodeFile
      while ((getline line < newCodeFile) > 0) {
        newCode = newCode "\n" line
      }
      close(newCodeFile)
    }
    /<!-- Monetag廣告代碼/ { 
      adCodeFound = 1 
      skip = 1
      print newCode
      next
    }
    /<\/script>/ && adCodeFound == 1 && skip == 1 { 
      skip = 0 
      next
    }
    skip == 1 { next }
    /google-adsense-account/ || /adsbygoogle/ { googleAdsFound = 1; next }
    /<\/head>/ { 
      if (adCodeFound == 0) {
        print newCode
      }
      print
      next
    }
    { print }
  ' "$file" > "${file}.new" && mv "${file}.new" "$file"
  
  echo "   完成！"
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

# 刪除臨時文件
rm monetag_code.txt

echo "完成！現在廣告只會在正式環境中顯示，本地開發時不會顯示廣告。" 