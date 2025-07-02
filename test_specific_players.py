#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys

def test_specific_players_and_teams():
    """測試指定選手和隊伍的表現數據"""
    
    # 載入數據
    try:
        with open('firebase_data/season3_player_performance.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        players_data = data['season3_player_performance']['players']
    except FileNotFoundError:
        print("❌ 數據文件未找到，請先執行 analyze_season3_player_performance.py")
        return
    except Exception as e:
        print(f"❌ 載入數據時發生錯誤: {e}")
        return

    # 測試選手列表
    test_players = ['小薩', '船長', '小萱']
    test_teams = ['人生揪難', '醉販']
    
    print("=" * 80)
    print("🎯 Season 3 選手表現測試")
    print("=" * 80)
    
    # 測試選手數據
    print("\n📊 選手表現測試")
    print("-" * 50)
    
    for player_name in test_players:
        print(f"\n🏆 {player_name}")
        
        if player_name in players_data:
            player = players_data[player_name]
            print(f"   隊伍: {'/'.join(player['teams'])}")
            print(f"   總出賽: {player['total_sets_played']} 場")
            print(f"   總勝場: {player['total_sets_won']} 場")
            print(f"   總勝率: {player['total_win_rate']}%")
            print(f"   參與比賽: {player['matches_played']} 場")
            
            # 顯示最佳和最差的SET表現
            set_performance = []
            for i in range(1, 17):
                set_data = player['set_details'][str(i)]
                if set_data['played'] >= 3:  # 至少3場才有參考價值
                    set_performance.append({
                        'set': i,
                        'played': set_data['played'],
                        'won': set_data['won'],
                        'win_rate': set_data['win_rate']
                    })
            
            if set_performance:
                # 最佳SET
                best_sets = sorted(set_performance, key=lambda x: x['win_rate'], reverse=True)[:3]
                worst_sets = sorted(set_performance, key=lambda x: x['win_rate'])[:3]
                
                print(f"   最佳SET: " + ", ".join([f"SET{s['set']}({s['win_rate']}%)" for s in best_sets]))
                print(f"   最差SET: " + ", ".join([f"SET{s['set']}({s['win_rate']}%)" for s in worst_sets]))
            
            # 比賽記錄摘要
            if 'games_detail' in player and player['games_detail']:
                recent_games = player['games_detail'][-3:]  # 最後3場
                print("   最近3場比賽:")
                for game in recent_games:
                    print(f"     • {game['game']}: {game['away_team']} vs {game['home_team']} ({game['player_team_side']}場)")
        else:
            print("   ❌ 選手資料未找到")
    
    # 測試隊伍數據
    print(f"\n🏢 隊伍表現測試")
    print("-" * 50)
    
    for team_name in test_teams:
        print(f"\n🏢 {team_name}")
        
        # 找出該隊伍的所有選手
        team_players = []
        for player_name, player_data in players_data.items():
            if team_name in player_data['teams']:
                team_players.append({
                    'name': player_name,
                    'total_sets_played': player_data['total_sets_played'],
                    'total_sets_won': player_data['total_sets_won'],
                    'total_win_rate': player_data['total_win_rate'],
                    'matches_played': player_data['matches_played']
                })
        
        if team_players:
            # 按出賽次數排序
            team_players.sort(key=lambda x: x['total_sets_played'], reverse=True)
            
            # 計算隊伍統計
            total_sets_played = sum(p['total_sets_played'] for p in team_players)
            total_sets_won = sum(p['total_sets_won'] for p in team_players)
            team_win_rate = (total_sets_won / total_sets_played * 100) if total_sets_played > 0 else 0
            
            print(f"   隊伍選手數: {len(team_players)} 人")
            print(f"   總出賽次數: {total_sets_played} 場")
            print(f"   總勝場數: {total_sets_won} 場")
            print(f"   隊伍勝率: {team_win_rate:.1f}%")
            
            print("   選手表現:")
            print("   " + "-" * 60)
            print(f"   {'選手':<12} {'出賽':<8} {'勝場':<8} {'勝率':<8} {'比賽':<8}")
            print("   " + "-" * 60)
            
            for player in team_players:
                print(f"   {player['name']:<12} {player['total_sets_played']:<8} {player['total_sets_won']:<8} {player['total_win_rate']:<7.1f}% {player['matches_played']:<8}")
            
            # 隊伍分析
            print(f"\n   📈 隊伍分析:")
            top_players = [p for p in team_players if p['total_win_rate'] >= 60]
            average_players = [p for p in team_players if 40 <= p['total_win_rate'] < 60]
            poor_players = [p for p in team_players if p['total_win_rate'] < 40]
            
            print(f"     • 高勝率選手(60%+): {len(top_players)} 人")
            print(f"     • 一般選手(40-60%): {len(average_players)} 人") 
            print(f"     • 待改善選手(40%-): {len(poor_players)} 人")
            
            if top_players:
                top_names = [p['name'] for p in top_players]
                print(f"     • 主力選手: {', '.join(top_names)}")
                
        else:
            print("   ❌ 隊伍資料未找到或無選手數據")
    
    print("\n" + "=" * 80)
    print("✅ 測試完成！")
    print("=" * 80)

if __name__ == "__main__":
    test_specific_players_and_teams() 