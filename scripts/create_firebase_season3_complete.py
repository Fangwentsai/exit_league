#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os

def create_firebase_complete_stats():
    """使用已驗證的正確數據創建Firebase格式的完整統計"""
    
    # 讀取已驗證的正確統計數據
    with open('season3_final_correct_stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    teams_data = data['teams']
    all_matches = data['all_matches']
    
    # 為每場比賽和隊伍添加勝場加成
    firebase_teams = {}
    firebase_matches = []
    
    # 處理隊伍統計
    for team_name, team_stats in teams_data.items():
        # 計算勝場加成
        win_bonus = team_stats['wins']
        
        # 更新最終分數（SET分 + 勝場加成 + 飲酒加成）
        updated_final_score = team_stats['total_points'] + win_bonus + team_stats['drinking_bonus']
        
        firebase_teams[team_name] = {
            'name': team_name,
            'wins': team_stats['wins'],
            'losses': team_stats['losses'],
            'draws': team_stats['draws'],
            'set_points': team_stats['total_points'],
            'win_bonus': win_bonus,
            'drinking_bonus': team_stats['drinking_bonus'],
            'final_score': updated_final_score,
            'win_rate': team_stats['win_rate'],
            'matches_played': team_stats['matches_played'],
            'matches': []
        }
        
        # 處理每場比賽，添加勝場加成
        for match in team_stats['matches']:
            # 計算此場比賽的勝場加成
            match_win_bonus = 1 if match['result'] == 'win' else 0
            
            # 更新比賽總分
            updated_total = match['points'] + match_win_bonus + match['drinking']
            
            updated_match = {
                'game': match['game'],
                'opponent': match['opponent'],
                'position': match['position'],
                'set_points': match['points'],
                'opponent_set_points': match['opponent_points'],
                'win_bonus': match_win_bonus,
                'drinking_bonus': match['drinking'],
                'total': updated_total,
                'result': match['result']
            }
            
            firebase_teams[team_name]['matches'].append(updated_match)
    
    # 處理所有比賽記錄，添加雙方的勝場加成
    for match in all_matches:
        # 判定勝負
        if match['away_points'] > match['home_points']:
            away_win_bonus = 1
            home_win_bonus = 0
            winner = match['away_team']
        elif match['home_points'] > match['away_points']:
            away_win_bonus = 0
            home_win_bonus = 1
            winner = match['home_team']
        else:  # 和局
            away_win_bonus = 0
            home_win_bonus = 0
            winner = 'draw'
        
        # 計算更新後的總分
        away_total_updated = match['away_points'] + away_win_bonus + match['away_drinking']
        home_total_updated = match['home_points'] + home_win_bonus + match['home_drinking']
        
        firebase_match = {
            'file': match['file'],
            'date': match['date'],
            'away_team': match['away_team'],
            'home_team': match['home_team'],
            'away_set_points': match['away_points'],
            'home_set_points': match['home_points'],
            'away_win_bonus': away_win_bonus,
            'home_win_bonus': home_win_bonus,
            'away_drinking_bonus': match['away_drinking'],
            'home_drinking_bonus': match['home_drinking'],
            'away_total': away_total_updated,
            'home_total': home_total_updated,
            'winner': winner
        }
        
        firebase_matches.append(firebase_match)
    
    # 準備Firebase格式數據
    firebase_data = {
        'season3_complete_stats': {
            'last_updated': '2024-12-26',
            'total_matches': len(firebase_matches),
            'scoring_rules': {
                'set_scores': [1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4],
                'win_bonus': 1,
                'drinking_bonus': 'varies_by_team_and_match'
            },
            'teams': firebase_teams,
            'all_matches': firebase_matches
        }
    }
    
    # 保存到Firebase目錄
    output_file = 'firebase_data/season3_complete_final.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(firebase_data, f, ensure_ascii=False, indent=2)
    
    print(f"完整統計已保存到 {output_file}")
    
    # 顯示最終排名
    print("\n=== Season 3 最終排名（包含勝場加成）===")
    sorted_teams = sorted(firebase_teams.items(), key=lambda x: x[1]['final_score'], reverse=True)
    
    print(f"{'排名':<3} {'隊伍':<12} {'勝':<3} {'敗':<3} {'和':<3} {'SET分':<6} {'勝場分':<6} {'飲酒分':<6} {'總分':<6}")
    print("-" * 70)
    
    for rank, (team_name, stats) in enumerate(sorted_teams, 1):
        print(f"{rank:<3} {team_name:<12} {stats['wins']:<3} {stats['losses']:<3} {stats['draws']:<3} "
              f"{stats['set_points']:<6} {stats['win_bonus']:<6} {stats['drinking_bonus']:<6} {stats['final_score']:<6}")
    
    # 驗證數據平衡
    total_wins = sum(team['wins'] for team in firebase_teams.values())
    total_losses = sum(team['losses'] for team in firebase_teams.values())
    total_draws = sum(team['draws'] for team in firebase_teams.values())
    total_set_points = sum(team['set_points'] for team in firebase_teams.values())
    total_win_bonus = sum(team['win_bonus'] for team in firebase_teams.values())
    total_drinking_bonus = sum(team['drinking_bonus'] for team in firebase_teams.values())
    
    print(f"\n=== 數據驗證 ===")
    print(f"總比賽場數：{len(firebase_matches)}")
    print(f"總勝場：{total_wins}, 總敗場：{total_losses}, 總和局：{total_draws}")
    print(f"勝敗平衡：{'✅' if total_wins == total_losses else '❌'}")
    print(f"總SET積分：{total_set_points}")
    print(f"總勝場加成：{total_win_bonus}")
    print(f"總飲酒加成：{total_drinking_bonus}")
    
    return firebase_data

if __name__ == '__main__':
    create_firebase_complete_stats() 