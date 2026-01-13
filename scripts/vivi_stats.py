#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
統計 VIVI嘻嘻隊 和 VIVI哈哈隊 的參賽率
"""

import os
import re
from collections import defaultdict

# 設定路徑
SEASON5_PATH = "/Users/jessetsai_mba/Cursor/exit_league/game_result/season5"

def extract_team_info(html_content):
    """從 HTML 中提取隊伍資訊和選手名單"""
    
    # 從 match-result div 提取實際的主客隊名稱
    # 客隊 (away team)
    away_team_match = re.search(r'<div class="team away">\s*<div class="team-name">([^<]+)</div>', html_content)
    # 主隊 (home team)
    home_team_match = re.search(r'<div class="team home">\s*(?:<div class="team-score">[^<]+</div>\s*)?<div class="team-name">([^<]+)</div>', html_content)
    
    if not away_team_match or not home_team_match:
        return None
    
    away_team = away_team_match.group(1).strip()
    home_team = home_team_match.group(1).strip()
    
    # 提取選手名單
    away_players_match = re.search(r"const awayPlayers = \[([^\]]+)\]", html_content)
    home_players_match = re.search(r"const homePlayers = \[([^\]]+)\]", html_content)
    
    if not away_players_match or not home_players_match:
        return None
    
    # 解析選手名單
    def parse_players(players_str):
        # 移除引號並分割
        players = re.findall(r"'([^']+)'", players_str)
        return players
    
    away_players = parse_players(away_players_match.group(1))
    home_players = parse_players(home_players_match.group(1))
    
    return {
        'away_team': away_team,
        'home_team': home_team,
        'away_players': away_players,
        'home_players': home_players
    }

def analyze_vivi_teams():
    """分析 VIVI 兩隊的參賽情況"""
    
    # 統計數據
    vivi_xixi_stats = defaultdict(lambda: {'total_games': 0, 'appearances': 0})
    vivi_haha_stats = defaultdict(lambda: {'total_games': 0, 'appearances': 0})
    
    vivi_xixi_total_games = 0
    vivi_haha_total_games = 0
    
    # 遍歷所有比賽文件
    for i in range(1, 91):
        filename = f"g{i:02d}.html"
        filepath = os.path.join(SEASON5_PATH, filename)
        
        if not os.path.exists(filepath):
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        info = extract_team_info(content)
        if not info:
            continue
        
        # 檢查是否為 VIVI嘻嘻隊 的比賽
        if 'VIVI嘻嘻隊' in info['away_team'] or 'VIVI嘻嘻隊' in info['home_team']:
            vivi_xixi_total_games += 1
            
            if 'VIVI嘻嘻隊' in info['away_team']:
                players = info['away_players']
            else:
                players = info['home_players']
            
            for player in players:
                vivi_xixi_stats[player]['appearances'] += 1
        
        # 檢查是否為 VIVI哈哈隊 的比賽
        if 'VIVI哈哈隊' in info['away_team'] or 'VIVI哈哈隊' in info['home_team']:
            vivi_haha_total_games += 1
            
            if 'VIVI哈哈隊' in info['away_team']:
                players = info['away_players']
            else:
                players = info['home_players']
            
            for player in players:
                vivi_haha_stats[player]['appearances'] += 1
    
    # 輸出統計結果
    print("=" * 70)
    print("VIVI嘻嘻隊 參賽統計")
    print("=" * 70)
    print(f"總場次: {vivi_xixi_total_games} 場")
    print("-" * 70)
    print(f"{'選手名稱':<15} {'出賽場次':>10} {'總場次':>10} {'出賽比例':>15}")
    print("-" * 70)
    
    # 按出賽場次排序
    sorted_xixi = sorted(vivi_xixi_stats.items(), key=lambda x: x[1]['appearances'], reverse=True)
    for player, stats in sorted_xixi:
        appearances = stats['appearances']
        rate = (appearances / vivi_xixi_total_games * 100) if vivi_xixi_total_games > 0 else 0
        print(f"{player:<15} {appearances:>10} {vivi_xixi_total_games:>10} {rate:>14.1f}%")
    
    print("\n")
    print("=" * 70)
    print("VIVI哈哈隊 參賽統計")
    print("=" * 70)
    print(f"總場次: {vivi_haha_total_games} 場")
    print("-" * 70)
    print(f"{'選手名稱':<15} {'出賽場次':>10} {'總場次':>10} {'出賽比例':>15}")
    print("-" * 70)
    
    # 按出賽場次排序
    sorted_haha = sorted(vivi_haha_stats.items(), key=lambda x: x[1]['appearances'], reverse=True)
    for player, stats in sorted_haha:
        appearances = stats['appearances']
        rate = (appearances / vivi_haha_total_games * 100) if vivi_haha_total_games > 0 else 0
        print(f"{player:<15} {appearances:>10} {vivi_haha_total_games:>10} {rate:>14.1f}%")
    
    print("\n")
    print("=" * 70)
    print("統計完成！")
    print("=" * 70)

if __name__ == "__main__":
    analyze_vivi_teams()

