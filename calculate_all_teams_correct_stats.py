#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import json
from collections import defaultdict

# SET分數定義（根據admin-main.js）
SET_SCORES = {
    1: 1, 2: 1, 3: 1, 4: 1,     # SET1-4: 1分（單人賽）
    5: 3,                        # SET5: 3分（三人賽 701）
    6: 1, 7: 1, 8: 1, 9: 1,     # SET6-9: 1分（單人Cricket）
    10: 3,                       # SET10: 3分（三人賽 Cricket）
    11: 2, 12: 2,               # SET11-12: 2分（雙人賽）
    13: 2, 14: 2,               # SET13-14: 2分（雙人賽 Cricket）
    15: 4, 16: 4                # SET15-16: 4分（四人賽）
}

def analyze_match_correct(file_path):
    """使用正確的積分規則分析單場比賽"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取隊伍名稱
    home_team_match = re.search(r'<div class="team home">.*?<div class="team-name">(.*?)</div>', content, re.DOTALL)
    away_team_match = re.search(r'<div class="team away">.*?<div class="team-name">(.*?)</div>', content, re.DOTALL)
    
    if not home_team_match or not away_team_match:
        return None
    
    home_team = home_team_match.group(1).strip()
    away_team = away_team_match.group(1).strip()
    
    # 提取比賽日期
    date_match = re.search(r'<h2 class="match-date">(.*?)</h2>', content)
    match_date = date_match.group(1).strip() if date_match else "未知日期"
    
    # 提取JavaScript中的比賽數據
    match_data_pattern = r'const g\d+Matches = \[(.*?)\];'
    match_data_match = re.search(match_data_pattern, content, re.DOTALL)
    
    if not match_data_match:
        return None
    
    # 解析JavaScript數據
    matches_str = '[' + match_data_match.group(1) + ']'
    try:
        matches_str = matches_str.replace("'", '"')
        matches_str = re.sub(r'(\w+):', r'"\1":', matches_str)
        matches_str = re.sub(r':\s*([a-zA-Z]\w*)', r': "\1"', matches_str)
        
        matches = eval(matches_str)
        
        # 計算積分
        away_points = 0
        home_points = 0
        
        for match in matches:
            winner = match['winner']
            set_num = match['set']
            set_score = SET_SCORES.get(set_num, 1)  # 默認1分
            
            if winner == 'away':
                away_points += set_score
            elif winner == 'home':
                home_points += set_score
        
        # 檢查飲酒加成
        drinking_bonus_match = re.search(r'const drinkingBonus = \{[^}]*away:\s*(\d+)[^}]*home:\s*(\d+)[^}]*\}', content)
        away_drinking = int(drinking_bonus_match.group(1)) if drinking_bonus_match else 0
        home_drinking = int(drinking_bonus_match.group(2)) if drinking_bonus_match else 0
        
        # 計算總分
        away_total = away_points + away_drinking
        home_total = home_points + home_drinking
        
        # 判斷勝負（只看純積分，不考慮飲酒加成）
        if away_points > home_points:
            winner_team = away_team
            loser_team = home_team
            result = 'away'
        elif home_points > away_points:
            winner_team = home_team
            loser_team = away_team
            result = 'home'
        else:
            winner_team = None
            loser_team = None
            result = 'draw'
        
        return {
            'file': os.path.basename(file_path),
            'date': match_date,
            'away_team': away_team,
            'home_team': home_team,
            'away_points': away_points,
            'home_points': home_points,
            'away_drinking': away_drinking,
            'home_drinking': home_drinking,
            'away_total': away_total,
            'home_total': home_total,
            'result': result,
            'winner': winner_team,
            'loser': loser_team
        }
        
    except Exception as e:
        print(f"❌ 解析錯誤 {file_path}: {e}")
        return None

def calculate_all_teams_stats():
    """計算所有隊伍的正確戰績和總分"""
    
    print("🏸 Season3 所有隊伍戰績重新計算（正確積分規則）")
    print("="*80)
    
    # 你的截圖數據作為對照
    user_data = {
        "Vivi朝酒晚舞": {"wins": 11, "losses": 1, "draws": 2, "total_points": 275, "drinking_bonus": 65, "final_score": 351},
        "海盜揪硬": {"wins": 12, "losses": 1, "draws": 1, "total_points": 311, "drinking_bonus": 10, "final_score": 333},
        "醉販": {"wins": 9, "losses": 5, "draws": 0, "total_points": 211, "drinking_bonus": 30, "final_score": 250},
        "酒空組": {"wins": 6, "losses": 7, "draws": 1, "total_points": 201, "drinking_bonus": 27, "final_score": 234},
        "Jack": {"wins": 4, "losses": 10, "draws": 0, "total_points": 169, "drinking_bonus": 57, "final_score": 230},
        "逃生入口C": {"wins": 6, "losses": 8, "draws": 0, "total_points": 190, "drinking_bonus": 22, "final_score": 218},
        "逃生入口A": {"wins": 5, "losses": 8, "draws": 1, "total_points": 183, "drinking_bonus": 20, "final_score": 208},
        "人生揪難": {"wins": 1, "losses": 12, "draws": 1, "total_points": 140, "drinking_bonus": 47, "final_score": 188}
    }
    
    # 初始化統計
    team_stats = defaultdict(lambda: {
        'wins': 0, 'losses': 0, 'draws': 0,
        'total_points': 0, 'drinking_bonus': 0, 'final_score': 0,
        'matches': []
    })
    
    all_matches = []
    
    # 分析所有比賽
    for i in range(1, 57):
        file_path = f'game_result/season3/g{i:02d}.html'
        if os.path.exists(file_path):
            result = analyze_match_correct(file_path)
            if result:
                all_matches.append(result)
                
                away_team = result['away_team']
                home_team = result['home_team']
                
                # 累計積分和飲酒加成
                team_stats[away_team]['total_points'] += result['away_points']
                team_stats[away_team]['drinking_bonus'] += result['away_drinking']
                team_stats[away_team]['final_score'] += result['away_total']
                
                team_stats[home_team]['total_points'] += result['home_points']
                team_stats[home_team]['drinking_bonus'] += result['home_drinking']
                team_stats[home_team]['final_score'] += result['home_total']
                
                # 統計勝負
                if result['result'] == 'away':
                    team_stats[away_team]['wins'] += 1
                    team_stats[home_team]['losses'] += 1
                elif result['result'] == 'home':
                    team_stats[home_team]['wins'] += 1
                    team_stats[away_team]['losses'] += 1
                else:  # draw
                    team_stats[away_team]['draws'] += 1
                    team_stats[home_team]['draws'] += 1
                
                # 記錄比賽詳情
                team_stats[away_team]['matches'].append({
                    'game': result['file'],
                    'opponent': home_team,
                    'position': 'away',
                    'points': result['away_points'],
                    'opponent_points': result['home_points'],
                    'drinking': result['away_drinking'],
                    'total': result['away_total'],
                    'result': 'win' if result['result'] == 'away' else 'loss' if result['result'] == 'home' else 'draw'
                })
                
                team_stats[home_team]['matches'].append({
                    'game': result['file'],
                    'opponent': away_team,
                    'position': 'home',
                    'points': result['home_points'],
                    'opponent_points': result['away_points'],
                    'drinking': result['home_drinking'],
                    'total': result['home_total'],
                    'result': 'win' if result['result'] == 'home' else 'loss' if result['result'] == 'away' else 'draw'
                })
    
    # 顯示比對結果
    print(f"📊 戰績和總分比對結果:")
    print(f"{'隊伍':15} {'我的統計':20} {'你的數據':20} {'勝負符合':8} {'總分符合':8}")
    print("-" * 85)
    
    perfect_matches = 0
    season3_correct_stats = {}
    
    for team in sorted(user_data.keys()):
        my_stats = team_stats[team]
        user_stats = user_data[team]
        
        my_record = f"{my_stats['wins']}勝{my_stats['losses']}敗{my_stats['draws']}和"
        user_record = f"{user_stats['wins']}勝{user_stats['losses']}敗{user_stats['draws']}和"
        
        my_scores = f"{my_stats['total_points']}+{my_stats['drinking_bonus']}={my_stats['final_score']}"
        user_scores = f"{user_stats['total_points']}+{user_stats['drinking_bonus']}={user_stats['final_score']}"
        
        # 檢查勝負是否符合
        record_match = (my_stats['wins'] == user_stats['wins'] and 
                       my_stats['losses'] == user_stats['losses'] and 
                       my_stats['draws'] == user_stats['draws'])
        
        # 檢查總分是否符合
        score_match = (my_stats['total_points'] == user_stats['total_points'] and
                      my_stats['drinking_bonus'] == user_stats['drinking_bonus'] and
                      my_stats['final_score'] == user_stats['final_score'])
        
        record_status = "✅" if record_match else "❌"
        score_status = "✅" if score_match else "❌"
        
        if record_match and score_match:
            perfect_matches += 1
        
        print(f"{team:15} {my_record:20} {user_record:20} {record_status:8} {score_status:8}")
        print(f"{'':15} {my_scores:20} {user_scores:20}")
        print()
        
        # 計算勝率（排除和局）
        total_decided = my_stats['wins'] + my_stats['losses']
        win_rate = (my_stats['wins'] / total_decided * 100) if total_decided > 0 else 0
        
        # 保存到正確統計數據
        season3_correct_stats[team] = {
            'wins': my_stats['wins'],
            'losses': my_stats['losses'],
            'draws': my_stats['draws'],
            'total_points': my_stats['total_points'],
            'drinking_bonus': my_stats['drinking_bonus'],
            'final_score': my_stats['final_score'],
            'win_rate': round(win_rate, 1),
            'matches_played': len(my_stats['matches']),
            'matches': my_stats['matches']
        }
    
    print(f"📈 統計摘要:")
    print(f"完全符合的隊伍數: {perfect_matches}/8")
    print(f"總比賽場數: {len(all_matches)}")
    
    # 保存正確的統計數據
    output_data = {
        'season': 3,
        'last_updated': '2024-12-26',
        'scoring_rules': {
            'set_scores': SET_SCORES,
            'win_condition': 'pure_points_only',
            'drinking_bonus': 'affects_total_score_only'
        },
        'teams': season3_correct_stats,
        'all_matches': all_matches
    }
    
    # 保存為JSON
    with open('season3_final_correct_stats.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 完整統計數據已保存到: season3_final_correct_stats.json")
    
    # 生成排行榜
    print(f"\n🏆 Season3 最終排行榜:")
    sorted_teams = sorted(season3_correct_stats.items(), key=lambda x: x[1]['final_score'], reverse=True)
    
    print(f"{'排名':4} {'隊伍':15} {'勝':3} {'敗':3} {'和':3} {'積分':4} {'飲酒':4} {'總分':4} {'勝率':6}")
    print("-" * 70)
    
    for i, (team, stats) in enumerate(sorted_teams, 1):
        print(f"{i:4} {team:15} {stats['wins']:3} {stats['losses']:3} {stats['draws']:3} "
              f"{stats['total_points']:4} {stats['drinking_bonus']:4} {stats['final_score']:4} {stats['win_rate']:5.1f}%")
    
    return season3_correct_stats

def create_firebase_format():
    """創建適合Firebase的數據格式"""
    
    with open('season3_final_correct_stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Firebase格式：扁平化結構
    firebase_data = {
        'season3_teams': {},
        'season3_matches': {},
        'season3_metadata': {
            'total_teams': len(data['teams']),
            'total_matches': len(data['all_matches']),
            'scoring_rules': data['scoring_rules'],
            'last_updated': data['last_updated']
        }
    }
    
    # 隊伍數據
    for team_name, team_data in data['teams'].items():
        firebase_data['season3_teams'][team_name.replace(' ', '_')] = {
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
    
    # 比賽數據
    for i, match in enumerate(data['all_matches']):
        firebase_data['season3_matches'][f"match_{i+1:02d}"] = {
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
    with open('season3_firebase_format.json', 'w', encoding='utf-8') as f:
        json.dump(firebase_data, f, ensure_ascii=False, indent=2)
    
    print(f"🔥 Firebase格式數據已保存到: season3_firebase_format.json")
    
    return firebase_data

def main():
    stats = calculate_all_teams_stats()
    firebase_data = create_firebase_format()
    
    print(f"\n✅ 數據處理完成！")
    print(f"📁 生成文件:")
    print(f"   - season3_final_correct_stats.json (完整統計數據)")
    print(f"   - season3_firebase_format.json (Firebase格式)")
    print(f"\n🔧 建議後續步驟:")
    print(f"   1. 將Firebase格式數據上傳到資料庫")
    print(f"   2. 更新前端JavaScript使用正確的統計邏輯")
    print(f"   3. 修正所有隊伍頁面的戰績顯示")

if __name__ == '__main__':
    main() 