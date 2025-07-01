#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re

def analyze_specific_matches():
    """檢查特定比賽的詳細情況"""
    
    print("🔍 重新檢查逃生入口C的關鍵比賽")
    print("="*60)
    
    # 你提供的修正數據
    user_corrections = {
        'g29': {'exit_c_score': 17, 'opponent_score': 19, 'opponent': '逃生入口A'},
        'g35': {'exit_c_score': 14, 'opponent_score': 22, 'opponent': 'Jack'},  
        'g51': {'exit_c_score': 14, 'opponent_score': 22, 'opponent': '醉販'}
    }
    
    # 我需要找出可能被誤判的比賽
    # 基於你的數據是6勝8敗，我是5勝9敗，差1場
    # 可能有一場我判為「敗」實際是「勝」，或一場我判為「勝」實際是「敗」
    
    suspicious_matches = []
    
    # 檢查所有接近比分的比賽
    for i in range(1, 57):
        file_path = f'game_result/season3/g{i:02d}.html'
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 檢查是否包含逃生入口C
            if '逃生入口C' in content:
                # 提取隊伍名稱
                home_team_match = re.search(r'<div class="team home">.*?<div class="team-name">(.*?)</div>', content, re.DOTALL)
                away_team_match = re.search(r'<div class="team away">.*?<div class="team-name">(.*?)</div>', content, re.DOTALL)
                
                if home_team_match and away_team_match:
                    home_team = home_team_match.group(1).strip()
                    away_team = away_team_match.group(1).strip()
                    
                    # 檢查最終分數顯示
                    final_score_pattern = r'<div class="team-score">(\d+)</div>'
                    scores = re.findall(final_score_pattern, content)
                    
                    if len(scores) >= 2:
                        away_final_score = int(scores[0])
                        home_final_score = int(scores[1])
                        
                        game_num = f"g{i:02d}"
                        
                        print(f"\n📅 {game_num}.html")
                        print(f"🏟️  {away_team} (客) vs {home_team} (主)")
                        print(f"📊 最終分數: {away_final_score} vs {home_final_score}")
                        
                        # 判斷逃生入口C是主隊還是客隊
                        if away_team == '逃生入口C':
                            exit_c_score = away_final_score
                            opponent_score = home_final_score
                            opponent = home_team
                            position = "客隊"
                        else:
                            exit_c_score = home_final_score  
                            opponent_score = away_final_score
                            opponent = away_team
                            position = "主隊"
                        
                        # 判斷勝負
                        if exit_c_score > opponent_score:
                            result = "勝"
                        elif exit_c_score < opponent_score:
                            result = "敗"
                        else:
                            result = "和"
                        
                        print(f"🎯 逃生入口C ({position}): {exit_c_score}分 vs {opponent} {opponent_score}分 = 【{result}】")
                        
                        # 檢查是否是用戶修正的比賽
                        if game_num in user_corrections:
                            correction = user_corrections[game_num]
                            print(f"✏️  用戶修正: 逃生入口C {correction['exit_c_score']}分 vs {correction['opponent']} {correction['opponent_score']}分")
                            
                            # 重新判斷勝負
                            if correction['exit_c_score'] > correction['opponent_score']:
                                corrected_result = "勝"
                            elif correction['exit_c_score'] < correction['opponent_score']:
                                corrected_result = "敗"
                            else:
                                corrected_result = "和"
                            
                            print(f"🔄 修正後結果: 【{corrected_result}】")
                            
                            if result != corrected_result:
                                print(f"⚠️  勝負判定改變: {result} → {corrected_result}")
                        
                        # 標記接近比分的比賽
                        score_diff = abs(exit_c_score - opponent_score)
                        if score_diff <= 6:  # 6分以內算接近
                            suspicious_matches.append({
                                'game': game_num,
                                'exit_c_score': exit_c_score,
                                'opponent': opponent,
                                'opponent_score': opponent_score,
                                'result': result,
                                'score_diff': score_diff
                            })
                        
                        print("-" * 50)
    
    print(f"\n🤔 接近比分的比賽 (6分以內差距):")
    for match in suspicious_matches:
        print(f"{match['game']}: 逃生入口C {match['exit_c_score']} vs {match['opponent']} {match['opponent_score']} (差{match['score_diff']}分) - {match['result']}")
    
    print(f"\n💡 可能的問題:")
    print(f"1. 我從HTML解析的分數可能不準確")
    print(f"2. 可能某場比賽有特殊判定規則")  
    print(f"3. 可能存在我沒找到的隱藏比賽或取消的比賽")
    print(f"4. 總分計算方式可能不同（純積分 vs 包含飲酒加成）")

if __name__ == '__main__':
    analyze_specific_matches() 