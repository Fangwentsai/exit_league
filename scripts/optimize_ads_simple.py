#!/usr/bin/env python3
"""
簡化版：批次優化 game_result HTML 檔案的廣告配置
"""

import os
import re
from pathlib import Path

def optimize_file(file_path):
    """優化單個檔案"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        modified = False
        
        # 1. 更新自動廣告配置 - 啟用錨定和穿插廣告
        # 找到現有的 AdSense 配置並替換
        old_config_pattern = r'<script>\s*\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{[^}]*google_ad_client:[^}]*\}\);\s*</script>'
        
        new_config = '''<script>
        (adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: "ca-pub-4455508862703492",
            enable_page_level_ads: true,
            overlays: {bottom: false},
            anchor_ads: {enabled: true},  // 啟用錨定廣告（85.80%可視率）
            vignette_ads: {enabled: true},  // 啟用穿插廣告（95.12%可視率）
            content_ads: {enabled: false},
            multiplex_ads: {enabled: false},
            matched_content_ads: {enabled: false},
            display_ads: {enabled: false}  // 禁用網頁內廣告（26.20%可視率）
        });
    </script>'''
        
        if re.search(old_config_pattern, content):
            content = re.sub(old_config_pattern, new_config, content)
            modified = True
        
        # 2. 移除底部廣告（在 </body> 前的最後一個廣告）
        # 找到所有 AdSense 廣告區塊
        ad_blocks = list(re.finditer(r'<!-- Google AdSense -->.*?</script>\s*</div>', content, re.DOTALL))
        
        if len(ad_blocks) > 1:
            # 如果有多個廣告，移除最後一個（底部廣告）
            last_ad = ad_blocks[-1]
            # 確認這個廣告在 </body> 前
            if content.find('</body>', last_ad.end()) < 200:  # 在 </body> 前 200 字元內
                content = content[:last_ad.start()] + content[last_ad.end():]
                modified = True
        
        # 3. 優化頂部廣告格式
        top_ad_pattern = r'<!-- 靜態廣告版位 -->.*?data-ad-format="auto"'
        if re.search(top_ad_pattern, content, re.DOTALL):
            content = re.sub(
                r'data-ad-format="auto"',
                'data-ad-format="horizontal"',
                content,
                count=1
            )
            modified = True
        
        # 4. 確保頂部廣告有 min-height
        top_ad_style_pattern = r'(<div class="ad-section" style="[^"]*)"'
        if re.search(top_ad_style_pattern, content):
            def add_min_height(match):
                style = match.group(1)
                if 'min-height' not in style:
                    return style.rstrip('"') + '; min-height: 90px;"'
                return match.group(0)
            
            new_content = re.sub(top_ad_style_pattern, add_min_height, content, count=1)
            if new_content != content:
                content = new_content
                modified = True
        
        if not modified:
            return False
        
        # 寫回檔案
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
        
    except Exception as e:
        print(f"錯誤: {e}")
        return None

def main():
    """主程式"""
    season5_dir = Path('/Users/jessetsai_mba/Cursor/exit_league/game_result/season5')
    html_files = sorted(season5_dir.glob('g*.html'))
    
    print(f"🎯 開始優化 {len(html_files)} 個檔案...\n")
    
    success = 0
    skip = 0
    error = 0
    
    for html_file in html_files:
        print(f"📄 {html_file.name}...", end=' ')
        result = optimize_file(html_file)
        
        if result is True:
            print("✅ 已優化")
            success += 1
        elif result is False:
            print("⏭️  無需修改")
            skip += 1
        else:
            print("❌ 失敗")
            error += 1
    
    print(f"\n{'='*60}")
    print(f"📊 完成統計：")
    print(f"  ✅ 成功: {success} 個")
    print(f"  ⏭️  跳過: {skip} 個")
    print(f"  ❌ 錯誤: {error} 個")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()

