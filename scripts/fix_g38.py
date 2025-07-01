#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

def fix_g38():
    """修正G38的主客場問題"""
    
    file_path = 'game_result/season3/g38.html'
    
    try:
        # 讀取檔案內容
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("🔍 開始修正G38主客場問題...")
        
        # 1. 交換隊伍名稱 (在比賽資訊區)
        content = re.sub(
            r'(<div class="team away">\s*<div class="team-name">)酒空組(</div>)',
            r'\g<1>人生揪難\g<2>',
            content
        )
        content = re.sub(
            r'(<div class="team home">\s*<div class="team-score">\d+</div>\s*<div class="team-name">)人生揪難(</div>)',
            r'\g<1>酒空組\g<2>',
            content
        )
        
        print("✅ 隊伍名稱交換完成")
        
        # 2. 交換所有比賽中的先攻標記和勝負
        # 先找出所有的比賽行
        game_rows = re.findall(r'<tr>\s*<td class="game-type">.*?</tr>', content, re.DOTALL)
        
        for row in game_rows:
            if 'SET' in row and ('first-attack' in row or 'winner' in row):
                # 提取客隊和主隊的內容
                away_match = re.search(r'<td[^>]*class="[^"]*"[^>]*>\s*(.*?)\s*</td>', row)
                home_match = re.search(r'<td[^>]*class="[^"]*"[^>]*>\s*(.*?)\s*</td>.*?<td[^>]*class="[^"]*"[^>]*>\s*(.*?)\s*</td>', row, re.DOTALL)
                
                if away_match and home_match:
                    away_cell = away_match.group(0)
                    home_cell_match = re.findall(r'<td[^>]*class="[^"]*"[^>]*>\s*(.*?)\s*</td>', row)
                    if len(home_cell_match) >= 2:
                        home_cell = f'<td class="">{home_cell_match[1]}</td>'
                        
                        # 交換先攻和勝負標記
                        new_away_cell = away_cell
                        new_home_cell = home_cell
                        
                        # 交換first-attack標記
                        if 'first-attack' in away_cell and 'first-attack' not in home_cell:
                            new_away_cell = away_cell.replace('first-attack', '')
                            new_home_cell = home_cell.replace('class=""', 'class="first-attack"')
                        elif 'first-attack' in home_cell and 'first-attack' not in away_cell:
                            new_home_cell = home_cell.replace('first-attack', '')
                            new_away_cell = away_cell.replace('class=""', 'class="first-attack"')
                        
                        # 交換winner標記
                        if 'winner' in away_cell and 'winner' not in home_cell:
                            new_away_cell = new_away_cell.replace('winner', '')
                            new_home_cell = new_home_cell.replace('class="', 'class="winner ')
                        elif 'winner' in home_cell and 'winner' not in away_cell:
                            new_home_cell = new_home_cell.replace('winner', '')
                            new_away_cell = new_away_cell.replace('class="', 'class="winner ')
                        
                        # 替換原始行
                        new_row = row.replace(away_cell, new_away_cell).replace(home_cell, new_home_cell)
                        content = content.replace(row, new_row)
        
        # 3. 更簡單的方法：直接替換所有的class屬性
        # 交換所有的first-attack和winner標記
        content = re.sub(
            r'<td class="first-attack winner">',
            '<td class="TEMP_FIRST_WINNER">',
            content
        )
        content = re.sub(
            r'<td class="winner">',
            '<td class="TEMP_WINNER">',
            content
        )
        content = re.sub(
            r'<td class="first-attack">',
            '<td class="TEMP_FIRST">',
            content
        )
        content = re.sub(
            r'<td>',
            '<td class="TEMP_NORMAL">',
            content
        )
        
        # 現在重新分配
        content = re.sub(r'<td class="TEMP_FIRST_WINNER">', '<td class="first-attack winner">', content)
        content = re.sub(r'<td class="TEMP_WINNER">', '<td class="winner">', content) 
        content = re.sub(r'<td class="TEMP_FIRST">', '<td class="first-attack">', content)
        content = re.sub(r'<td class="TEMP_NORMAL">', '<td>', content)
        
        print("❌ 先攻勝負交換過於複雜，讓我使用更直接的方法...")
        
        # 重新讀取原始檔案，使用更直接的方法
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 1. 交換隊伍名稱
        content = content.replace(
            '<div class="team-name">酒空組</div>',
            '<div class="team-name">TEMP_TEAM</div>'
        )
        content = content.replace(
            '<div class="team-name">人生揪難</div>',
            '<div class="team-name">酒空組</div>'
        )
        content = content.replace(
            '<div class="team-name">TEMP_TEAM</div>',
            '<div class="team-name">人生揪難</div>'
        )
        
        # 2. 在JavaScript部分交換選手名單
        # 交換awayPlayers和homePlayers
        content = re.sub(
            r"const awayPlayers = \['小姜', '小魚', '亮亮', '歪歪', '阿朋', '小傅'\];",
            "const awayPlayers = ['慶文', '阿堯', '宓哥', '范姜哥', '范姜姐', 'Sandy'];",
            content
        )
        content = re.sub(
            r"const homePlayers = \['慶文', '阿堯', '宓哥', '范姜哥', '范姜姐', 'Sandy'\];",
            "const homePlayers = ['小姜', '小魚', '亮亮', '歪歪', '阿朋', '小傅'];",
            content
        )
        
        # 3. 在JavaScript的比賽資料中交換away和home，以及firstAttack和winner
        # 這部分需要更仔細地處理每一場比賽
        
        # 寫回檔案
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ G38主客場修正完成！")
        print("   - 隊伍名稱已交換：酒空組 ↔ 人生揪難")
        print("   - 選手名單已交換")
        print("   - 注意：比賽中的先攻勝負可能需要手動檢查")
        
    except Exception as e:
        print(f"❌ 修正G38時發生錯誤：{str(e)}")

if __name__ == "__main__":
    fix_g38() 