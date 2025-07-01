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

def analyze_match_with_victory_bonus(file_path):
    """使用正確的計分規則分析比賽（包含勝利+1分）"""
    
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
    
    try:
        # 解析JavaScript數據
        matches_str = '[' + match_data_match.group(1) + ']'
        matches_str = matches_str.replace("'", '"')
        matches_str = re.sub(r'(\w+):', r'"\1":', matches_str)
        matches_str = re.sub(r':\s*([a-zA-Z]\w*)', r': "\1"', matches_str)
        
        matches = eval(matches_str)
        
        # 計算SET積分
        away_set_points = 0
        home_set_points = 0
        
        for match in matches:
            winner = match['winner']
            set_num = match['set']
            set_score = SET_SCORES.get(set_num, 1)
            
            if winner == 'away':
                away_set_points += set_score
            elif winner == 'home':
                home_set_points += set_score
        
        # 檢查飲酒加成
        drinking_bonus_match = re.search(r'const drinkingBonus = \{[^}]*away:\s*(\d+)[^}]*home:\s*(\d+)[^}]*\}', content)
        away_drinking = int(drinking_bonus_match.group(1)) if drinking_bonus_match else 0
        home_drinking = int(drinking_bonus_match.group(2)) if drinking_bonus_match else 0
        
        # 判斷勝負（基於SET積分）
        if away_set_points > home_set_points:
            winner_team = away_team
            loser_team = home_team
            result = 'away'
            away_victory_bonus = 1  # 勝利方+1分
            home_victory_bonus = 0
        elif home_set_points > away_set_points:
            winner_team = home_team
            loser_team = away_team
            result = 'home'
            away_victory_bonus = 0
            home_victory_bonus = 1  # 勝利方+1分
        else:
            winner_team = None
            loser_team = None
            result = 'draw'
            away_victory_bonus = 0  # 和局沒有勝利加成
            home_victory_bonus = 0
        
        # 計算最終總分
        away_total = away_set_points + away_victory_bonus + away_drinking
        home_total = home_set_points + home_victory_bonus + home_drinking
        
        return {
            'file': os.path.basename(file_path),
            'date': match_date,
            'away_team': away_team,
            'home_team': home_team,
            'away_set_points': away_set_points,
            'home_set_points': home_set_points,
            'away_victory_bonus': away_victory_bonus,
            'home_victory_bonus': home_victory_bonus,
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

def recalculate_exit_c_with_correct_rules():
    """重新計算逃生入口C的戰績（使用正確規則）"""
    
    print("🏸 逃生入口C 重新計算（正確計分規則：勝利方+1分）")
    print("="*70)
    
    exit_c_matches = []
    wins = 0
    losses = 0
    draws = 0
    total_set_points = 0
    total_victory_bonus = 0
    total_drinking = 0
    
    # 分析所有比賽
    for i in range(1, 57):
        file_path = f'game_result/season3/g{i:02d}.html'
        if os.path.exists(file_path):
            result = analyze_match_with_victory_bonus(file_path)
            if result and ('逃生入口C' in [result['away_team'], result['home_team']]):
                exit_c_matches.append(result)
                
                # 判斷逃生入口C是主隊還是客隊
                is_away = result['away_team'] == '逃生入口C'
                
                if is_away:
                    set_points = result['away_set_points']
                    victory_bonus = result['away_victory_bonus']
                    drinking = result['away_drinking']
                    total = result['away_total']
                    opponent_set_points = result['home_set_points']
                    opponent_total = result['home_total']
                    position = "客隊"
                else:
                    set_points = result['home_set_points']
                    victory_bonus = result['home_victory_bonus']
                    drinking = result['home_drinking']
                    total = result['home_total']
                    opponent_set_points = result['away_set_points']
                    opponent_total = result['away_total']
                    position = "主隊"
                
                total_set_points += set_points
                total_victory_bonus += victory_bonus
                total_drinking += drinking
                
                # 統計勝負（基於SET積分）
                if set_points > opponent_set_points:
                    wins += 1
                    match_result = "勝"
                elif set_points < opponent_set_points:
                    losses += 1
                    match_result = "敗"
                else:
                    draws += 1
                    match_result = "和"
                
                # 顯示比賽詳情
                opponent = result['home_team'] if is_away else result['away_team']
                print(f"\n📅 {result['file']} - {result['date']}")
                print(f"🏟️  逃生入口C ({position}) vs {opponent}")
                print(f"🎯 SET積分: {set_points} vs {opponent_set_points}")
                print(f"🏆 勝利加成: +{victory_bonus}")
                print(f"🍺 飲酒加成: +{drinking}")
                print(f"📊 最終總分: {total} vs {opponent_total} = 【{match_result}】")
                print("-" * 60)
    
    # 顯示統計總結
    print(f"\n📈 逃生入口C Season3 正確統計:")
    print(f"總比賽數: {len(exit_c_matches)}")
    print(f"戰績: {wins}勝{losses}敗{draws}和")
    print(f"SET積分: {total_set_points}")
    print(f"勝利加成: {total_victory_bonus}")
    print(f"飲酒加成: {total_drinking}")
    print(f"總分: {total_set_points + total_victory_bonus + total_drinking}")
    
    # 計算勝率
    total_decided = wins + losses
    win_rate = (wins / total_decided * 100) if total_decided > 0 else 0
    print(f"勝率: {win_rate:.1f}%")
    
    print(f"\n🔍 與用戶數據比對:")
    print(f"我的新統計: {wins}勝{losses}敗{draws}和")
    print(f"用戶數據: 6勝8敗0和")
    
    if wins == 6 and losses == 8 and draws == 0:
        print("✅ 完全符合！計分規則修正成功！")
    else:
        print(f"❌ 仍有差異: 勝場 {6-wins:+d}, 敗場 {8-losses:+d}, 和局 {0-draws:+d}")
    
    return {
        'wins': wins,
        'losses': losses, 
        'draws': draws,
        'set_points': total_set_points,
        'victory_bonus': total_victory_bonus,
        'drinking_bonus': total_drinking,
        'final_score': total_set_points + total_victory_bonus + total_drinking,
        'matches': exit_c_matches
    }

if __name__ == '__main__':
    result = recalculate_exit_c_with_correct_rules()
    
    print(f"\n💡 計分規則確認:")
    print(f"1. SET積分：根據SET1-16的分數表")
    print(f"2. 勝利加成：勝利方額外+1分")
    print(f"3. 飲酒加成：根據比賽現場情況")
    print(f"4. 勝負判定：只看SET積分（不含勝利加成和飲酒）")
    print(f"5. 總分排名：SET積分+勝利加成+飲酒加成") 