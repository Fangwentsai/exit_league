#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import re
from pathlib import Path

def parse_game_html(file_path):
    """解析單場比賽HTML文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 提取比賽資訊
        date_match = re.search(r'<h2 class="match-date">([^<]+)</h2>', content)
        venue_match = re.search(r'<div class="venue-info">([^<]+)</div>', content)
        
        # 提取隊伍名稱
        away_team_match = re.search(r'<div class="team away">.*?<div class="team-name">([^<]+)</div>', content, re.DOTALL)
        home_team_match = re.search(r'<div class="team home">.*?<div class="team-name">([^<]+)</div>', content, re.DOTALL)
        
        if not all([date_match, venue_match, away_team_match, home_team_match]):
            print(f"Warning: Could not parse basic info from {file_path}")
            return None
        
        date = date_match.group(1).strip()
        venue = venue_match.group(1).strip()
        away_team = away_team_match.group(1).strip()
        home_team = home_team_match.group(1).strip()
        
        # 提取比賽數據 - 查找 JavaScript 中的 matches 數組
        matches_pattern = r'const\s+g\d+Matches\s*=\s*\[(.*?)\];'
        matches_match = re.search(matches_pattern, content, re.DOTALL)
        
        if not matches_match:
            print(f"Warning: Could not find matches data in {file_path}")
            return None
        
        # 提取飲酒加成
        drinking_pattern = r'const\s+drinkingBonus\s*=\s*\{[^}]*away:\s*(\d+)[^}]*home:\s*(\d+)[^}]*\}'
        drinking_match = re.search(drinking_pattern, content)
        
        away_drinking = 0
        home_drinking = 0
        if drinking_match:
            away_drinking = int(drinking_match.group(1))
            home_drinking = int(drinking_match.group(2))
        
        # 解析比賽結果
        matches_text = matches_match.group(1)
        
        # 計算SET勝負
        away_sets_won = 0
        home_sets_won = 0
        
        # 簡單的勝負計算 - 統計 winner 為 'away' 或 'home' 的次數
        away_wins = len(re.findall(r"winner:\s*['\"]away['\"]", matches_text))
        home_wins = len(re.findall(r"winner:\s*['\"]home['\"]", matches_text))
        
        # 計算SET得分
        away_score = calculate_set_score(away_wins)
        home_score = calculate_set_score(home_wins)
        
        # 判定勝負
        if away_score > home_score:
            winner = away_team
            loser = home_team
            away_win_bonus = 1
            home_win_bonus = 0
        elif home_score > away_score:
            winner = home_team
            loser = away_team
            away_win_bonus = 0
            home_win_bonus = 1
        else:
            winner = "draw"
            loser = "draw"
            away_win_bonus = 0
            home_win_bonus = 0
        
        # 計算總分
        away_total = away_score + away_win_bonus + away_drinking
        home_total = home_score + home_win_bonus + home_drinking
        
        return {
            'file': os.path.basename(file_path),
            'date': date,
            'venue': venue,
            'away_team': away_team,
            'home_team': home_team,
            'away_sets_won': away_wins,
            'home_sets_won': home_wins,
            'away_score': away_score,
            'home_score': home_score,
            'away_win_bonus': away_win_bonus,
            'home_win_bonus': home_win_bonus,
            'away_drinking': away_drinking,
            'home_drinking': home_drinking,
            'away_total': away_total,
            'home_total': home_total,
            'winner': winner,
            'loser': loser
        }
        
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

def calculate_set_score(sets_won):
    """根據勝場數計算SET得分"""
    # SET分數配置
    set_scores = [1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4]
    
    if sets_won > 16:
        sets_won = 16
    
    return sum(set_scores[:sets_won])

def calculate_team_stats(all_matches):
    """計算所有隊伍的統計數據"""
    teams = {}
    
    # 初始化所有隊伍
    all_team_names = set()
    for match in all_matches:
        all_team_names.add(match['away_team'])
        all_team_names.add(match['home_team'])
    
    for team_name in all_team_names:
        teams[team_name] = {
            'name': team_name,
            'wins': 0,
            'losses': 0,
            'draws': 0,
            'set_points': 0,
            'win_bonus': 0,
            'drinking_bonus': 0,
            'final_score': 0,
            'matches_played': 0,
            'matches': []
        }
    
    # 處理每場比賽
    for match in all_matches:
        away_team = match['away_team']
        home_team = match['home_team']
        
        # 客隊統計
        away_match_info = {
            'game': match['file'],
            'opponent': home_team,
            'position': 'away',
            'sets_won': match['away_sets_won'],
            'opponent_sets_won': match['home_sets_won'],
            'set_points': match['away_score'],
            'opponent_set_points': match['home_score'],
            'win_bonus': match['away_win_bonus'],
            'drinking_bonus': match['away_drinking'],
            'total': match['away_total'],
            'opponent_total': match['home_total']
        }
        
        # 主隊統計
        home_match_info = {
            'game': match['file'],
            'opponent': away_team,
            'position': 'home',
            'sets_won': match['home_sets_won'],
            'opponent_sets_won': match['away_sets_won'],
            'set_points': match['home_score'],
            'opponent_set_points': match['away_score'],
            'win_bonus': match['home_win_bonus'],
            'drinking_bonus': match['home_drinking'],
            'total': match['home_total'],
            'opponent_total': match['away_total']
        }
        
        # 判定勝負並添加結果
        if match['winner'] == away_team:
            away_match_info['result'] = 'win'
            home_match_info['result'] = 'loss'
            teams[away_team]['wins'] += 1
            teams[home_team]['losses'] += 1
        elif match['winner'] == home_team:
            away_match_info['result'] = 'loss'
            home_match_info['result'] = 'win'
            teams[away_team]['losses'] += 1
            teams[home_team]['wins'] += 1
        else:  # draw
            away_match_info['result'] = 'draw'
            home_match_info['result'] = 'draw'
            teams[away_team]['draws'] += 1
            teams[home_team]['draws'] += 1
        
        # 更新隊伍統計
        teams[away_team]['set_points'] += match['away_score']
        teams[away_team]['win_bonus'] += match['away_win_bonus']
        teams[away_team]['drinking_bonus'] += match['away_drinking']
        teams[away_team]['final_score'] += match['away_total']
        teams[away_team]['matches_played'] += 1
        teams[away_team]['matches'].append(away_match_info)
        
        teams[home_team]['set_points'] += match['home_score']
        teams[home_team]['win_bonus'] += match['home_win_bonus']
        teams[home_team]['drinking_bonus'] += match['home_drinking']
        teams[home_team]['final_score'] += match['home_total']
        teams[home_team]['matches_played'] += 1
        teams[home_team]['matches'].append(home_match_info)
    
    # 計算勝率
    for team in teams.values():
        if team['matches_played'] > 0:
            team['win_rate'] = round((team['wins'] / team['matches_played']) * 100, 1)
        else:
            team['win_rate'] = 0.0
    
    return teams

def main():
    """主函數"""
    # 讀取所有Season 3比賽文件
    season3_dir = Path('game_result/season3')
    all_matches = []
    
    print("開始解析Season 3比賽文件...")
    
    # 遍歷所有HTML文件
    for i in range(1, 57):  # g01.html 到 g56.html
        file_name = f'g{i:02d}.html'
        file_path = season3_dir / file_name
        
        if file_path.exists():
            print(f"解析 {file_name}...")
            match_data = parse_game_html(file_path)
            if match_data:
                all_matches.append(match_data)
            else:
                print(f"警告：無法解析 {file_name}")
        else:
            print(f"警告：文件不存在 {file_name}")
    
    print(f"成功解析 {len(all_matches)} 場比賽")
    
    # 計算隊伍統計
    print("計算隊伍統計...")
    teams_stats = calculate_team_stats(all_matches)
    
    # 準備Firebase格式的數據
    firebase_data = {
        'season3_complete_stats': {
            'last_updated': '2024-12-26',
            'total_matches': len(all_matches),
            'teams': teams_stats,
            'all_matches': all_matches
        }
    }
    
    # 保存到文件
    output_file = 'firebase_data/season3_complete_stats.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(firebase_data, f, ensure_ascii=False, indent=2)
    
    print(f"完整統計已保存到 {output_file}")
    
    # 顯示簡要統計
    print("\n=== Season 3 完整統計 ===")
    sorted_teams = sorted(teams_stats.items(), key=lambda x: x[1]['final_score'], reverse=True)
    
    print(f"{'排名':<3} {'隊伍':<12} {'勝':<3} {'敗':<3} {'和':<3} {'SET分':<6} {'勝場分':<6} {'飲酒分':<6} {'總分':<6}")
    print("-" * 70)
    
    for rank, (team_name, stats) in enumerate(sorted_teams, 1):
        print(f"{rank:<3} {team_name:<12} {stats['wins']:<3} {stats['losses']:<3} {stats['draws']:<3} "
              f"{stats['set_points']:<6} {stats['win_bonus']:<6} {stats['drinking_bonus']:<6} {stats['final_score']:<6}")
    
    # 驗證數據
    print(f"\n總比賽場數：{len(all_matches)}")
    total_wins = sum(team['wins'] for team in teams_stats.values())
    total_losses = sum(team['losses'] for team in teams_stats.values())
    total_draws = sum(team['draws'] for team in teams_stats.values())
    print(f"總勝場：{total_wins}, 總敗場：{total_losses}, 總和局：{total_draws}")

if __name__ == '__main__':
    main() 