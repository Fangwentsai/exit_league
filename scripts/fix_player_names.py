#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re

def fix_player_names():
    """修正Season 3所有比賽檔案中的人名標準化問題"""
    
    # 定義需要修正的人名對應
    name_fixes = {
        '范姜姊': '范姜姐',
        '大毛': '大根毛',
        '韋': '小韋',
        'ViVi朝酒晚舞': 'Vivi朝酒晚舞',
        '阿猴': '猴子',
        '長老芬': '小芬',
        '阿雞': '阿基',
        '凡': '伊凡'
    }
    
    season3_dir = 'game_result/season3'
    fixed_files = []
    
    # 取得所有比賽檔案
    game_files = [f for f in os.listdir(season3_dir) if f.endswith('.html')]
    game_files.sort(key=lambda x: int(x[1:-5]))
    
    for game_file in game_files:
        game_path = os.path.join(season3_dir, game_file)
        game_num = game_file[1:-5]
        
        try:
            # 讀取檔案內容
            with open(game_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_made = []
            
            # 進行人名替換
            for old_name, new_name in name_fixes.items():
                if old_name in content:
                    content = content.replace(old_name, new_name)
                    changes_made.append(f"{old_name} → {new_name}")
            
            # 如果有變更，寫回檔案
            if content != original_content:
                with open(game_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                fixed_files.append({
                    'game': game_num,
                    'changes': changes_made
                })
                print(f"✅ G{game_num}: {', '.join(changes_made)}")
            
        except Exception as e:
            print(f"❌ G{game_num}: 處理檔案時發生錯誤 - {str(e)}")
    
    print(f"\n🎉 完成！總共修正了 {len(fixed_files)} 個檔案")
    return fixed_files

if __name__ == "__main__":
    fix_player_names() 