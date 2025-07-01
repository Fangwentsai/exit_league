#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import json

# SET分數定義
SET_SCORES = {
    1: 1, 2: 1, 3: 1, 4: 1,     # SET1-4: 1分（單人賽）
    5: 3,                        # SET5: 3分（三人賽 701）
    6: 1, 7: 1, 8: 1, 9: 1,     # SET6-9: 1分（單人Cricket）
    10: 3,                       # SET10: 3分（三人賽 Cricket）
    11: 2, 12: 2,               # SET11-12: 2分（雙人賽）
    13: 2, 14: 2,               # SET13-14: 2分（雙人賽 Cricket）
    15: 4, 16: 4                # SET15-16: 4分（四人賽）
}

def analyze_match_detailed(file_path):
    """詳細分析單場比賽，包含SET明細"""
    
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
        
        # 分析每個SET
        set_details = []
        away_points = 0
        home_points = 0
        
        for match in matches:
            winner = match['winner']
            set_num = match['set']
            set_score = SET_SCORES.get(set_num, 1)
            
            set_info = {
                'set': set_num,
                'score': set_score,
                'winner': winner
            }
            set_details.append(set_info)
            
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
        
        # 判斷勝負（只看純積分）
        if away_points > home_points:
            result = 'away'
            winner_team = away_team
        elif home_points > away_points:
            result = 'home'
            winner_team = home_team
        else:
            result = 'draw'
            winner_team = None
        
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
            'set_details': set_details
        }
        
    except Exception as e:
        print(f"❌ 解析錯誤 {file_path}: {e}")
        return None

def analyze_exit_c_all_matches():
    """分析逃生入口C的所有比賽"""
    
    print("🏸 逃生入口C 完整比賽分析")
    print("="*80)
    
    exit_c_matches = []
    wins = 0
    losses = 0
    draws = 0
    total_points = 0
    total_drinking = 0
    
    # 分析所有比賽
    for i in range(1, 57):
        file_path = f'game_result/season3/g{i:02d}.html'
        if os.path.exists(file_path):
            result = analyze_match_detailed(file_path)
            if result and ('逃生入口C' in [result['away_team'], result['home_team']]):
                exit_c_matches.append(result)
                
                # 判斷逃生入口C是主隊還是客隊
                is_away = result['away_team'] == '逃生入口C'
                is_home = result['home_team'] == '逃生入口C'
                
                if is_away:
                    points = result['away_points']
                    drinking = result['away_drinking']
                    total = result['away_total']
                    opponent_points = result['home_points']
                    position = "客隊"
                else:
                    points = result['home_points']
                    drinking = result['home_drinking']
                    total = result['home_total']
                    opponent_points = result['away_points']
                    position = "主隊"
                
                total_points += points
                total_drinking += drinking
                
                # 統計勝負（基於純積分）
                if points > opponent_points:
                    wins += 1
                    match_result = "勝"
                elif points < opponent_points:
                    losses += 1
                    match_result = "敗"
                else:
                    draws += 1
                    match_result = "和"
                
                # 顯示比賽詳情
                opponent = result['home_team'] if is_away else result['away_team']
                print(f"\n📅 {result['file']} - {result['date']}")
                print(f"🏟️  逃生入口C ({position}) vs {opponent}")
                print(f"📊 積分: {points} vs {opponent_points} = 【{match_result}】")
                print(f"🍺 飲酒: 逃生入口C {drinking}, {opponent} {result['home_drinking'] if is_away else result['away_drinking']}")
                print(f"🏆 總分: {total} vs {result['home_total'] if is_away else result['away_total']}")
                
                # 顯示SET詳情
                print(f"🎯 SET明細:")
                for set_info in result['set_details']:
                    set_num = set_info['set']
                    score = set_info['score']
                    winner = set_info['winner']
                    
                    if winner == 'away':
                        winner_display = f"{result['away_team']} 獲勝"
                    elif winner == 'home':
                        winner_display = f"{result['home_team']} 獲勝"
                    else:
                        winner_display = "和局"
                    
                    print(f"   SET{set_num:2d} ({score}分) - {winner_display}")
                
                print("-" * 60)
    
    # 顯示統計總結
    print(f"\n📈 逃生入口C Season3 統計總結:")
    print(f"總比賽數: {len(exit_c_matches)}")
    print(f"戰績: {wins}勝{losses}敗{draws}和")
    print(f"純積分: {total_points}")
    print(f"飲酒加成: {total_drinking}")
    print(f"總分: {total_points + total_drinking}")
    
    # 計算勝率
    total_decided = wins + losses
    win_rate = (wins / total_decided * 100) if total_decided > 0 else 0
    print(f"勝率: {win_rate:.1f}% ({wins}勝 / {total_decided}場有勝負的比賽)")
    
    print(f"\n🔍 與用戶數據比對:")
    print(f"我的統計: {wins}勝{losses}敗{draws}和")
    print(f"用戶數據: 6勝8敗0和")
    print(f"差異: 勝場 {6-wins:+d}, 敗場 {8-losses:+d}, 和局 {0-draws:+d}")
    
    # 保存詳細數據
    exit_c_data = {
        'team': '逃生入口C',
        'summary': {
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'total_points': total_points,
            'drinking_bonus': total_drinking,
            'final_score': total_points + total_drinking,
            'win_rate': round(win_rate, 1),
            'matches_played': len(exit_c_matches)
        },
        'matches': exit_c_matches
    }
    
    with open('exit_c_detailed_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(exit_c_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 詳細分析數據已保存到: exit_c_detailed_analysis.json")
    
    return exit_c_matches

if __name__ == '__main__':
    analyze_exit_c_all_matches() 