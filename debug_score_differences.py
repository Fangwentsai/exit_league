#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import json

def debug_team_scores(team_name, expected_final_score):
    """調試特定隊伍的分數差異"""
    
    print(f"\n🔍 調試 {team_name} 的分數差異")
    print(f"期望總分: {expected_final_score}")
    print("-" * 50)
    
    # 從已生成的數據中讀取
    with open('season3_final_correct_stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    team_data = data['teams'][team_name]
    calculated_score = team_data['final_score']
    matches = team_data['matches']
    
    print(f"計算總分: {calculated_score}")
    print(f"差異: {expected_final_score - calculated_score}")
    
    # 顯示所有比賽詳情
    print(f"\n📋 {team_name} 所有比賽:")
    total_points = 0
    total_drinking = 0
    
    for i, match in enumerate(matches, 1):
        total_points += match['points']
        total_drinking += match['drinking']
        
        print(f"{i:2}. {match['game']} vs {match['opponent']:15} "
              f"({match['position']:4}) - "
              f"積分:{match['points']:2} 飲酒:{match['drinking']:2} "
              f"總計:{match['total']:2} [{match['result']:4}]")
    
    print(f"\n📊 統計總計:")
    print(f"總積分: {total_points}")
    print(f"總飲酒: {total_drinking}")
    print(f"總分: {total_points + total_drinking}")
    print(f"期望總分: {expected_final_score}")
    print(f"差異: {expected_final_score - (total_points + total_drinking)}")
    
    return total_points + total_drinking

def create_corrected_data():
    """創建手動修正的數據"""
    
    # 你提供的正確數據
    correct_data = {
        "Vivi朝酒晚舞": {"wins": 11, "losses": 1, "draws": 2, "total_points": 275, "drinking_bonus": 65, "final_score": 351},
        "海盜揪硬": {"wins": 12, "losses": 1, "draws": 1, "total_points": 311, "drinking_bonus": 10, "final_score": 333},
        "醉販": {"wins": 9, "losses": 5, "draws": 0, "total_points": 211, "drinking_bonus": 30, "final_score": 250},
        "酒空組": {"wins": 6, "losses": 7, "draws": 1, "total_points": 201, "drinking_bonus": 27, "final_score": 234},
        "Jack": {"wins": 4, "losses": 10, "draws": 0, "total_points": 169, "drinking_bonus": 57, "final_score": 230},
        "逃生入口C": {"wins": 6, "losses": 8, "draws": 0, "total_points": 190, "drinking_bonus": 22, "final_score": 218},
        "逃生入口A": {"wins": 5, "losses": 8, "draws": 1, "total_points": 183, "drinking_bonus": 20, "final_score": 208},
        "人生揪難": {"wins": 1, "losses": 12, "draws": 1, "total_points": 140, "drinking_bonus": 47, "final_score": 188}
    }
    
    print("🏸 Season3 正確數據版本創建")
    print("="*80)
    
    # 讀取現有的計算結果
    with open('season3_final_correct_stats.json', 'r', encoding='utf-8') as f:
        calculated_data = json.load(f)
    
    # 創建修正版本
    corrected_stats = {}
    
    for team_name, correct_stats in correct_data.items():
        # 使用正確的統計數據，但保留比賽詳情
        calculated_team = calculated_data['teams'].get(team_name, {})
        
        # 計算正確的勝率
        total_decided = correct_stats['wins'] + correct_stats['losses']
        win_rate = (correct_stats['wins'] / total_decided * 100) if total_decided > 0 else 0
        
        corrected_stats[team_name] = {
            'wins': correct_stats['wins'],
            'losses': correct_stats['losses'],
            'draws': correct_stats['draws'],
            'total_points': correct_stats['total_points'],
            'drinking_bonus': correct_stats['drinking_bonus'],
            'final_score': correct_stats['final_score'],
            'win_rate': round(win_rate, 1),
            'matches_played': correct_stats['wins'] + correct_stats['losses'] + correct_stats['draws'],
            'matches': calculated_team.get('matches', [])  # 保留比賽詳情（如果有的話）
        }
    
    # 創建完整的正確數據結構
    final_corrected_data = {
        'season': 3,
        'last_updated': '2024-12-26',
        'data_source': 'user_provided_correct_stats',
        'scoring_rules': {
            'set_scores': calculated_data['scoring_rules']['set_scores'],
            'win_condition': 'pure_points_only',
            'drinking_bonus': 'affects_total_score_only'
        },
        'teams': corrected_stats,
        'all_matches': calculated_data.get('all_matches', [])
    }
    
    # 保存修正後的數據
    with open('season3_user_corrected_stats.json', 'w', encoding='utf-8') as f:
        json.dump(final_corrected_data, f, ensure_ascii=False, indent=2)
    
    # 創建Firebase格式
    firebase_corrected = {
        'season3_teams': {},
        'season3_matches': {},
        'season3_metadata': {
            'total_teams': len(corrected_stats),
            'total_matches': len(final_corrected_data['all_matches']),
            'scoring_rules': final_corrected_data['scoring_rules'],
            'last_updated': final_corrected_data['last_updated'],
            'data_source': 'user_provided_correct_stats'
        }
    }
    
    # 隊伍數據
    for team_name, team_data in corrected_stats.items():
        firebase_corrected['season3_teams'][team_name.replace(' ', '_')] = {
            'name': team_name,
            'wins': team_data['wins'],
            'losses': team_data['losses'],
            'draws': team_data['draws'],
            'total_points': team_data['total_points'],
            'drinking_bonus': team_data['drinking_bonus'],
            'final_score': team_data['final_score'],
            'win_rate': team_data['win_rate'],
            'matches_played': team_data['matches_played']
        }
    
    # 比賽數據（保持原有的）
    for i, match in enumerate(final_corrected_data['all_matches']):
        firebase_corrected['season3_matches'][f"match_{i+1:02d}"] = {
            'game_file': match['file'],
            'date': match['date'],
            'away_team': match['away_team'],
            'home_team': match['home_team'],
            'away_points': match['away_points'],
            'home_points': match['home_points'],
            'away_drinking': match['away_drinking'],
            'home_drinking': match['home_drinking'],
            'away_total': match['away_total'],
            'home_total': match['home_total'],
            'result': match['result'],
            'winner': match['winner'],
            'loser': match['loser']
        }
    
    # 保存Firebase格式
    with open('season3_user_corrected_firebase.json', 'w', encoding='utf-8') as f:
        json.dump(firebase_corrected, f, ensure_ascii=False, indent=2)
    
    # 顯示排行榜
    print(f"\n🏆 Season3 最終排行榜（用戶提供的正確數據）:")
    sorted_teams = sorted(corrected_stats.items(), key=lambda x: x[1]['final_score'], reverse=True)
    
    print(f"{'排名':4} {'隊伍':15} {'勝':3} {'敗':3} {'和':3} {'積分':4} {'飲酒':4} {'總分':4} {'勝率':6}")
    print("-" * 70)
    
    for i, (team, stats) in enumerate(sorted_teams, 1):
        print(f"{i:4} {team:15} {stats['wins']:3} {stats['losses']:3} {stats['draws']:3} "
              f"{stats['total_points']:4} {stats['drinking_bonus']:4} {stats['final_score']:4} {stats['win_rate']:5.1f}%")
    
    print(f"\n💾 修正後的數據已保存:")
    print(f"   - season3_user_corrected_stats.json (用戶提供的正確統計)")
    print(f"   - season3_user_corrected_firebase.json (Firebase格式)")
    
    return corrected_stats

def main():
    print("🔧 分數差異調試和數據修正")
    print("="*50)
    
    # 調試主要差異
    debug_team_scores("酒空組", 234)  # 你說的正確總分
    
    # 創建修正數據
    create_corrected_data()
    
    print(f"\n✅ 總結:")
    print(f"1. 發現我的計算與你的數據有小幅差異")
    print(f"2. 已創建基於你提供數據的正確版本")
    print(f"3. 建議使用 season3_user_corrected_firebase.json 作為標準數據")

if __name__ == '__main__':
    main() 