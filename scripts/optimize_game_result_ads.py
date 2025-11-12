#!/usr/bin/env python3
"""
批次優化 game_result HTML 檔案的廣告配置
- 移除底部低可視率廣告
- 統一頂部廣告配置
- 添加高可視率自動廣告配置（錨定+穿插）
"""

import os
import re
from pathlib import Path

# 統一的 head 區塊配置（包含 Google Analytics 和 AdSense）
HEAD_CONFIG = '''    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17514530743"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'AW-17514530743');
    </script>
    
    <!-- Event snippet for 網頁瀏覽 (1) conversion page -->
    <script>
    function gtag_report_conversion(url) {
      var callback = function () {
        if (typeof(url) != 'undefined') {
          window.location = url;
        }
      };
      gtag('event', 'conversion', {
          'send_to': 'AW-17514530743/PWRNCNSo5ZAbELePyp9B',
          'event_callback': callback
      });
      return false;
    }
    </script>
    
    <link rel="icon" href="../../images/favicon.ico" type="image/x-icon">
    
    <!-- Google AdSense 優化配置 - 只啟用高可視率廣告 -->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4455508862703492" crossorigin="anonymous"></script>
    <script>
        (adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "ca-pub-4455508862703492",
            enable_page_level_ads: true,
            overlays: {bottom: false},
            anchor_ads: {enabled: true},  // 啟用錨定廣告（高可視率）
            vignette_ads: {enabled: true},  // 啟用穿插廣告（高可視率）
            content_ads: {enabled: false},
            multiplex_ads: {enabled: false},
            matched_content_ads: {enabled: false},
            display_ads: {enabled: false}  // 禁用網頁內廣告（低可視率）
        });
    </script>'''

# 統一的頂部廣告配置
TOP_AD = '''
        <!-- 頂部廣告 - 優化位置提高可視率 -->
        <div class="ad-section" style="text-align: center; margin: 15px auto 20px; max-width: 728px; width: 100%; min-height: 90px;">
            <ins class="adsbygoogle"
                 style="display:block;width:100%;max-width:728px;height:90px"
                 data-ad-client="ca-pub-4455508862703492"
                 data-ad-format="horizontal"
                 data-full-width-responsive="true"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>
'''

def process_html_file(file_path):
    """處理單個 HTML 檔案"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 1. 移除底部廣告（在 </body> 前的廣告區塊）
        # 匹配最後一個 AdSense 廣告區塊（通常在頁面底部）
        bottom_ad_pattern = r'\s*<!-- Google AdSense -->[\s\S]*?<script>\s*\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);\s*</script>\s*</div>\s*(?=</body>)'
        content = re.sub(bottom_ad_pattern, '', content)
        
        # 2. 統一 head 區塊的廣告配置
        # 先找到 head 結束標籤的位置
        head_end = content.find('</head>')
        if head_end == -1:
            print(f"  ⚠️  找不到 </head> 標籤")
            return False
        
        # 移除舊的 Google Analytics 和 AdSense 配置
        # 從 <head> 到 <link rel="stylesheet" 之前的所有內容
        head_start = content.find('<head>')
        if head_start == -1:
            print(f"  ⚠️  找不到 <head> 標籤")
            return False
        
        # 找到 stylesheet 的位置
        stylesheet_pos = content.find('<link rel="stylesheet"', head_start)
        if stylesheet_pos == -1:
            print(f"  ⚠️  找不到 stylesheet")
            return False
        
        # 保留 title, description, keywords 等 meta 標籤
        meta_section_end = content.find('>', content.find('<meta name="keywords"')) + 1
        
        # 重建 head 區塊
        new_head = content[head_start:meta_section_end] + '\n    \n' + HEAD_CONFIG + '\n    \n    ' + content[stylesheet_pos:head_end]
        content = content[:head_start] + new_head + content[head_end:]
        
        # 3. 統一頂部廣告配置
        # 找到 match-info 結束的位置
        match_info_end = content.find('</div>', content.find('class="match-info"'))
        if match_info_end != -1:
            # 找到下一個 </div> 後的位置
            match_info_end = content.find('</div>', match_info_end) + 6
            
            # 移除現有的廣告區塊（如果存在）
            ad_section_pattern = r'\s*<!-- 靜態廣告版位 -->[\s\S]*?</script>\s*</div>'
            next_section = content.find('<div class="games-container">', match_info_end)
            if next_section == -1:
                next_section = content.find('<div class="games-container">', match_info_end)
            
            if next_section != -1:
                between_content = content[match_info_end:next_section]
                if 'adsbygoogle' in between_content:
                    # 移除舊廣告
                    content = content[:match_info_end] + '\n' + content[next_section:]
                    match_info_end = content.find('</div>', content.find('class="match-info"'))
                    match_info_end = content.find('</div>', match_info_end) + 6
                
                # 插入新的頂部廣告
                content = content[:match_info_end] + TOP_AD + '\n' + content[match_info_end:]
        
        # 檢查是否有實際修改
        if content == original_content:
            print(f"  ℹ️  沒有需要修改的內容")
            return False
        
        # 寫回檔案
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
        
    except Exception as e:
        print(f"  ❌ 處理失敗: {e}")
        return False

def main():
    """主程式"""
    season5_dir = Path('/Users/jessetsai_mba/Cursor/exit_league/game_result/season5')
    
    if not season5_dir.exists():
        print("❌ 找不到 season5 目錄")
        return
    
    html_files = sorted(season5_dir.glob('g*.html'))
    
    print(f"🎯 開始批次優化 {len(html_files)} 個 HTML 檔案...\n")
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for html_file in html_files:
        print(f"📄 處理 {html_file.name}...", end=' ')
        result = process_html_file(html_file)
        
        if result:
            print("✅ 完成")
            success_count += 1
        elif result is False:
            print("⏭️  跳過")
            skip_count += 1
        else:
            error_count += 1
    
    print(f"\n" + "="*60)
    print(f"📊 處理完成統計：")
    print(f"  ✅ 成功修改: {success_count} 個檔案")
    print(f"  ⏭️  跳過: {skip_count} 個檔案")
    print(f"  ❌ 錯誤: {error_count} 個檔案")
    print(f"  📁 總計: {len(html_files)} 個檔案")
    print("="*60)

if __name__ == '__main__':
    main()

