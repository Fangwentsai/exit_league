#!/bin/bash

# 遍歷所有的比賽結果HTML文件
find game_result -name "*.html" | while read -r file; do
  echo "修復文件: $file"
  
  # 使用sed命令移除錯誤的片段
  sed -i '' 's/ crossorigin="anonymous"><\/script>//' "$file"
done

echo "完成修復！" 