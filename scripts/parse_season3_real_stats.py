#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import json
from bs4 import BeautifulSoup
from collections import defaultdict

def extract_match_data_from_html(file_path):
    """從HTML文件中提取比賽數據"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找JavaScript中的比賽數據
    match_pattern = r'const\s+g\d+Matches\s*=\s*\[([\s\S]*?)\];'
    match_data = re.search(match_pattern, content)
    
    if not match_data:
        print(f"警告: 無法在 {file_path} 中找到比賽數據")
        return None
    
    # 提取隊伍名稱
    soup = BeautifulSoup(content, 'html.parser')
    team_elements = soup.find_all('div', class_='team-name')
    if len(team_elements) >= 2:
        away_team = team_elements[0].get_text().strip()
        home_team = team_elements[1].get_text().strip()
    else:
        print(f"警告: 無法在 {file_path} 中找到隊伍名稱")
        return None
    
    # 提取比賽日期
    date_element = soup.find('h2', class_='match-date')
    match_date = date_element.get_text().strip() if date_element else "未知日期"
    
    # 解析JavaScript比賽數據
    js_data = match_data.group(1)
    
    # 簡單的JavaScript對象解析
    matches = []
    lines = js_data.split('\n')
    
    for line in lines:
        line = line.strip()
        if line.startswith('{') and line.endswith('},') or line.endswith('}'):
            # 移除尾部的逗號
            line = line.rstrip(',')
            
            # 提取各個字段
            set_match = re.search(r'set:\s*(\d+)', line)
            type_match = re.search(r"type:\s*['\"]([^'\"]+)['\"]", line)
            away_match = re.search(r"away:\s*(.+?),\s*home:", line)
            home_match = re.search(r"home:\s*(.+?),\s*firstAttack:", line)
            winner_match = re.search(r"winner:\s*['\"]([^'\"]+)['\"]", line)
            
            if all([set_match, type_match, away_match, home_match, winner_match]):
                set_num = int(set_match.group(1))
                game_type = type_match.group(1)
                away_players_str = away_match.group(1).strip()
                home_players_str = home_match.group(1).strip()
                winner = winner_match.group(1)
                
                # 解析選手名單
                away_players = parse_players(away_players_str)
                home_players = parse_players(home_players_str)
                
                matches.append({
                    'set': set_num,
                    'type': game_type,
                    'away_players': away_players,
                    'home_players': home_players,
                    'winner': winner
                })
    
    return {
        'file': os.path.basename(file_path),
        'date': match_date,
        'away_team': away_team,
        'home_team': home_team,
        'matches': matches
    }

def parse_players(players_str):
    """解析選手字符串，處理單人和多人情況"""
    if players_str.startswith('[') and players_str.endswith(']'):
        # 多人情況 ['player1','player2']
        content = players_str[1:-1]
        players = []
        for player in content.split(','):
            player = player.strip().strip("'\"")
            if player:
                players.append(player)
        return players
    else:
        # 單人情況
        return [players_str.strip().strip("'\"")]

def calculate_team_stats(all_matches, team_name):
    """計算指定隊伍的統計數據"""
    player_stats = defaultdict(lambda: defaultdict(lambda: {'played': 0, 'won': 0}))
    
    for match_data in all_matches:
        if match_data['away_team'] == team_name or match_data['home_team'] == team_name:
            is_away = match_data['away_team'] == team_name
            
            for match in match_data['matches']:
                set_num = match['set']
                players = match['away_players'] if is_away else match['home_players']
                won = (match['winner'] == 'away') if is_away else (match['winner'] == 'home')
                
                for player in players:
                    player_stats[player][set_num]['played'] += 1
                    if won:
                        player_stats[player][set_num]['won'] += 1
    
    return player_stats

def format_stats_for_team(player_stats):
    """格式化統計數據為前端需要的格式"""
    result = {}
    
    for set_num in range(1, 17):  # SET 1-16
        top_players = []
        
        # 計算所有選手在此SET的勝率
        player_rates = []
        for player, stats in player_stats.items():
            if set_num in stats and stats[set_num]['played'] > 0:
                played = stats[set_num]['played']
                won = stats[set_num]['won']
                win_rate = (won / played) * 100
                player_rates.append({
                    'name': player,
                    'rate': f"{win_rate:.1f}%",
                    'win_rate': win_rate,
                    'played': played,
                    'won': won
                })
        
        # 按勝率排序，取前3名
        player_rates.sort(key=lambda x: x['win_rate'], reverse=True)
        top_players = player_rates[:3]
        
        # 如果不足3人，用空數據補足
        while len(top_players) < 3:
            top_players.append({
                'name': '暫無數據',
                'rate': '0.0%',
                'win_rate': 0,
                'played': 0,
                'won': 0
            })
        
        result[set_num] = top_players
    
    return result

def main():
    # 載入隊伍成員數據
    with open('data/player_by_season.json', 'r', encoding='utf-8') as f:
        team_members = json.load(f)
    
    # 解析所有season3比賽
    season3_dir = 'game_result/season3'
    all_matches = []
    
    print("開始解析season3比賽數據...")
    
    for i in range(1, 57):  # g01.html 到 g56.html
        file_path = os.path.join(season3_dir, f'g{i:02d}.html')
        if os.path.exists(file_path):
            print(f"解析 {file_path}...")
            match_data = extract_match_data_from_html(file_path)
            if match_data:
                all_matches.append(match_data)
            else:
                print(f"跳過 {file_path} (無法解析)")
        else:
            print(f"文件不存在: {file_path}")
    
    print(f"總共解析了 {len(all_matches)} 場比賽")
    
    # 計算各隊伍統計數據
    team_stats = {}
    
    for team_name in team_members.keys():
        print(f"\n計算 {team_name} 的統計數據...")
        player_stats = calculate_team_stats(all_matches, team_name)
        
        if player_stats:
            formatted_stats = format_stats_for_team(player_stats)
            team_stats[team_name] = {
                'player_stats': dict(player_stats),
                'set_top_players': formatted_stats
            }
            
            # 顯示一些統計信息
            print(f"{team_name} 的選手統計:")
            for player, stats in player_stats.items():
                total_played = sum(s['played'] for s in stats.values())
                total_won = sum(s['won'] for s in stats.values())
                if total_played > 0:
                    overall_rate = (total_won / total_played) * 100
                    print(f"  {player}: {total_won}/{total_played} ({overall_rate:.1f}%)")
        else:
            print(f"  {team_name} 沒有找到比賽數據")
    
    # 保存結果
    output_file = 'season3_real_stats.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(team_stats, f, ensure_ascii=False, indent=2)
    
    print(f"\n統計數據已保存到 {output_file}")
    
    # 顯示逃生入口C的詳細數據作為示例
    if '逃生入口C' in team_stats:
        print("\n=== 逃生入口C的SET排行榜數據 ===")
        exit_c_data = team_stats['逃生入口C']['set_top_players']
        for set_num in range(1, 6):  # 只顯示前5個SET作為示例
            print(f"SET{set_num}:")
            for i, player in enumerate(exit_c_data[set_num][:3]):
                print(f"  {i+1}. {player['name']} - {player['rate']} ({player['won']}/{player['played']})")

if __name__ == "__main__":
    main() 