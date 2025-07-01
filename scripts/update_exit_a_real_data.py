#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re

def update_exit_a_html():
    # 載入真實統計數據
    with open('season3_real_stats.json', 'r', encoding='utf-8') as f:
        stats = json.load(f)
    
    exit_a_data = stats['逃生入口A']
    player_stats = exit_a_data['player_stats']
    set_top_players = exit_a_data['set_top_players']
    
    # 計算每個SET的總出賽和勝場數
    set_stats = {}
    for set_num in range(1, 17):
        total_played = 0
        total_won = 0
        
        for player, player_data in player_stats.items():
            if str(set_num) in player_data:
                total_played += player_data[str(set_num)]['played']
                total_won += player_data[str(set_num)]['won']
        
        if total_played > 0:
            win_rate = (total_won / total_played) * 100
        else:
            win_rate = 0.0
            
        set_stats[set_num] = {
            'played': total_played,
            'won': total_won,
            'winRate': round(win_rate, 1)
        }
    
    # 生成新的JavaScript代碼
    js_set_data = "const exitASetData = [\n"
    for set_num in range(1, 17):
        stats = set_stats[set_num]
        js_set_data += f"            {{set: {set_num}, played: {stats['played']}, won: {stats['won']}, winRate: {stats['winRate']}}},\n"
    js_set_data += "        ];"
    
    # 生成新的排行榜數據
    js_top_players = "const exitASetTopPlayers = {\n"
    for set_num in range(1, 17):
        top_players_data = set_top_players[str(set_num)]
        js_top_players += f"            {set_num}: ["
        
        for i, player in enumerate(top_players_data):
            if i > 0:
                js_top_players += ", "
            js_top_players += f'{{name: "{player["name"]}", rate: "{player["rate"]}"}}'
        
        js_top_players += "],\n"
    
    js_top_players += "        };"
    
    # 讀取現有HTML文件
    with open('pages/advance/shops/exit-a.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # 替換SET數據
    set_data_pattern = r'const exitASetData = \[([\s\S]*?)\];'
    html_content = re.sub(set_data_pattern, js_set_data, html_content)
    
    # 替換排行榜數據
    top_players_pattern = r'const exitASetTopPlayers = \{([\s\S]*?)\};'
    html_content = re.sub(top_players_pattern, js_top_players, html_content)
    
    # 寫回文件
    with open('pages/advance/shops/exit-a.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("✅ 逃生入口A的HTML文件已更新為Season3真實數據")
    
    # 顯示統計摘要
    print("\n=== 逃生入口A Season3 真實數據摘要 ===")
    total_played = sum(s['played'] for s in set_stats.values())
    total_won = sum(s['won'] for s in set_stats.values())
    overall_rate = (total_won / total_played) * 100 if total_played > 0 else 0
    
    print(f"總出賽: {total_played}")
    print(f"總勝場: {total_won}")
    print(f"整體勝率: {overall_rate:.1f}%")
    
    print("\n各選手表現:")
    for player, player_data in player_stats.items():
        total_p = sum(s['played'] for s in player_data.values())
        total_w = sum(s['won'] for s in player_data.values())
        if total_p > 0:
            rate = (total_w / total_p) * 100
            print(f"  {player}: {total_w}/{total_p} ({rate:.1f}%)")
    
    print("\n前5個SET的TOP3:")
    for set_num in range(1, 6):
        print(f"SET{set_num}:")
        for i, player in enumerate(set_top_players[str(set_num)][:3]):
            played = 0
            won = 0
            if player['name'] in player_stats and str(set_num) in player_stats[player['name']]:
                played = player_stats[player['name']][str(set_num)]['played']
                won = player_stats[player['name']][str(set_num)]['won']
            print(f"  {i+1}. {player['name']} - {player['rate']} ({won}/{played})")

if __name__ == "__main__":
    update_exit_a_html() 