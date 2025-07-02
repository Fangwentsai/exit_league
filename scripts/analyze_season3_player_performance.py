#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import re
from pathlib import Path
from collections import defaultdict

def parse_game_html(file_path):
    """解析單場比賽HTML文件，提取選手在各SET的表現"""
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
            print(f"無法解析基本資訊: {file_path}")
            return None
        
        # 提取比賽數據（JavaScript部分）
        matches_pattern = r'const\s+g\d+Matches\s*=\s*\[(.*?)\];'
        matches_match = re.search(matches_pattern, content, re.DOTALL)
        
        if not matches_match:
            print(f"無法找到比賽數據: {file_path}")
            return None
        
        # 解析比賽數據
        matches_str = matches_match.group(1)
        
        # 提取選手名單
        away_players_match = re.search(r'const awayPlayers = \[(.*?)\];', content)
        home_players_match = re.search(r'const homePlayers = \[(.*?)\];', content)
        
        if not away_players_match or not home_players_match:
            print(f"無法找到選手名單: {file_path}")
            return None
        
        # 解析SET比賽結果
        set_results = []
        set_pattern = r'\{set:\s*(\d+),.*?winner:\s*[\'"](\w+)[\'"].*?\}'
        
        for match in re.finditer(set_pattern, matches_str):
            set_num = int(match.group(1))
            winner = match.group(2)  # 'away' 或 'home'
            set_results.append({
                'set': set_num,
                'winner': winner
            })
        
        # 解析各SET的參賽選手
        set_players = parse_set_players(matches_str)
        
        return {
            'game_file': os.path.basename(file_path),
            'date': date_match.group(1).strip(),
            'venue': venue_match.group(1).strip(),
            'away_team': away_team_match.group(1).strip(),
            'home_team': home_team_match.group(1).strip(),
            'away_players': parse_player_list(away_players_match.group(1)),
            'home_players': parse_player_list(home_players_match.group(1)),
            'set_results': set_results,
            'set_players': set_players
        }
        
    except Exception as e:
        print(f"解析檔案時發生錯誤 {file_path}: {e}")
        return None

def parse_player_list(players_str):
    """解析選手名單字串"""
    players = []
    for match in re.finditer(r'[\'"]([^\'\"]+)[\'"]', players_str):
        players.append(match.group(1))
    return players

def parse_set_players(matches_str):
    """解析各SET的參賽選手"""
    set_players = {}
    
    # 使用正則表達式匹配每個SET
    set_pattern = r'\{set:\s*(\d+),.*?away:\s*([^,]+),.*?home:\s*([^,]+),.*?winner:\s*[\'"](\w+)[\'"].*?\}'
    
    for match in re.finditer(set_pattern, matches_str, re.DOTALL):
        set_num = int(match.group(1))
        away_players_str = match.group(2)
        home_players_str = match.group(3)
        winner = match.group(4)
        
        # 解析away和home的選手
        away_players = parse_players_from_set(away_players_str)
        home_players = parse_players_from_set(home_players_str)
        
        set_players[set_num] = {
            'away_players': away_players,
            'home_players': home_players,
            'winner': winner
        }
    
    return set_players

def parse_players_from_set(players_str):
    """從SET字串中解析選手名單"""
    players = []
    
    # 處理單人或多人格式
    if '[' in players_str and ']' in players_str:
        # 多人格式：['player1','player2','player3']
        player_matches = re.findall(r'[\'"]([^\'\"]+)[\'"]', players_str)
        players = player_matches
    else:
        # 單人格式：'player'
        player_match = re.search(r'[\'"]([^\'\"]+)[\'"]', players_str)
        if player_match:
            players = [player_match.group(1)]
    
    return players

def analyze_player_performance():
    """分析Season 3每個選手的表現"""
    
    # 讀取選手隊伍資訊
    with open('data/player_by_season.json', 'r', encoding='utf-8') as f:
        player_teams = json.load(f)
    
    # 建立選手隊伍對應表（Season 3）
    player_to_team = {}
    for team, seasons in player_teams.items():
        if 'season3' in seasons:
            for player in seasons['season3']:
                if player not in player_to_team:
                    player_to_team[player] = []
                player_to_team[player].append(team)
    
    # 初始化選手統計
    player_stats = defaultdict(lambda: {
        'name': '',
        'teams': [],
        'total_sets_played': 0,
        'total_sets_won': 0,
        'total_win_rate': 0.0,
        'set_details': {i: {'played': 0, 'won': 0, 'win_rate': 0.0} for i in range(1, 17)},
        'matches_played': 0,
        'games_detail': []
    })
    
    # 遍歷所有Season 3比賽文件
    season3_dir = Path('game_result/season3')
    for game_file in sorted(season3_dir.glob('g*.html')):
        print(f"處理比賽: {game_file.name}")
        
        game_data = parse_game_html(game_file)
        if not game_data:
            continue
        
        # 分析每個SET中的選手表現
        for set_num, set_info in game_data['set_players'].items():
            winner_side = set_info['winner']  # 'away' or 'home'
            
            # 處理客隊選手
            for player in set_info['away_players']:
                if player in player_to_team:
                    player_stats[player]['name'] = player
                    player_stats[player]['teams'] = list(set(player_to_team[player]))
                    player_stats[player]['total_sets_played'] += 1
                    player_stats[player]['set_details'][set_num]['played'] += 1
                    
                    # 如果客隊獲勝，該選手獲勝
                    if winner_side == 'away':
                        player_stats[player]['total_sets_won'] += 1
                        player_stats[player]['set_details'][set_num]['won'] += 1
            
            # 處理主隊選手
            for player in set_info['home_players']:
                if player in player_to_team:
                    player_stats[player]['name'] = player
                    player_stats[player]['teams'] = list(set(player_to_team[player]))
                    player_stats[player]['total_sets_played'] += 1
                    player_stats[player]['set_details'][set_num]['played'] += 1
                    
                    # 如果主隊獲勝，該選手獲勝
                    if winner_side == 'home':
                        player_stats[player]['total_sets_won'] += 1
                        player_stats[player]['set_details'][set_num]['won'] += 1
        
        # 記錄參與的比賽
        for player in game_data['away_players'] + game_data['home_players']:
            if player in player_to_team:
                player_stats[player]['matches_played'] += 1
                player_stats[player]['games_detail'].append({
                    'game': game_data['game_file'],
                    'date': game_data['date'],
                    'away_team': game_data['away_team'],
                    'home_team': game_data['home_team'],
                    'player_team_side': 'away' if player in game_data['away_players'] else 'home'
                })
    
    # 計算勝率
    for player_name, stats in player_stats.items():
        # 總勝率
        if stats['total_sets_played'] > 0:
            stats['total_win_rate'] = round(stats['total_sets_won'] / stats['total_sets_played'] * 100, 1)
        
        # 各SET勝率
        for set_num in range(1, 17):
            played = stats['set_details'][set_num]['played']
            won = stats['set_details'][set_num]['won']
            if played > 0:
                stats['set_details'][set_num]['win_rate'] = round(won / played * 100, 1)
    
    # 按總出賽次數排序
    sorted_players = sorted(player_stats.items(), key=lambda x: x[1]['total_sets_played'], reverse=True)
    
    # 轉換為最終格式
    final_stats = {
        'season3_player_performance': {
            'last_updated': '2024-12-26',
            'total_players': len(sorted_players),
            'analysis_scope': 'Season 3 - 56場比賽，SET 1-16 詳細統計',
            'players': {}
        }
    }
    
    for player_name, stats in sorted_players:
        final_stats['season3_player_performance']['players'][player_name] = stats
    
    # 儲存結果
    output_file = 'firebase_data/season3_player_performance.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_stats, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== Season 3 選手表現分析完成 ===")
    print(f"總選手數：{len(sorted_players)}")
    print(f"資料已儲存至：{output_file}")
    
    # 顯示前10名選手統計
    print(f"\n=== 前10名最活躍選手 ===")
    for i, (player_name, stats) in enumerate(sorted_players[:10], 1):
        print(f"{i:2d}. {player_name:8s} | 隊伍: {'/'.join(stats['teams']):15s} | 總出賽: {stats['total_sets_played']:3d} | 總勝場: {stats['total_sets_won']:3d} | 勝率: {stats['total_win_rate']:5.1f}%")
    
    return final_stats

if __name__ == "__main__":
    analyze_player_performance() 