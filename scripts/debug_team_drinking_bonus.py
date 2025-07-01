#!/usr/bin/env python3
"""
調試特定隊伍的飲酒加成計算
"""

import json
import sys
from pathlib import Path

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ Firebase Admin SDK未安裝")
    sys.exit(1)

def debug_team_drinking_bonus(service_account_path, team_name):
    """調試特定隊伍的飲酒加成"""
    try:
        # 初始化Firebase
        if service_account_path:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
        
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 載入所有Season 3比賽
        games_ref = db.collection('matches').document('season3').collection('games')
        games = games_ref.order_by('game_number').stream()
        
        matches = []
        for game in games:
            match_data = game.to_dict()
            match_data['id'] = game.id
            matches.append(match_data)
        
        print(f"✅ 載入完成: {len(matches)} 場比賽")
        
        # 找出該隊伍參與的所有比賽
        team_matches = []
        for match in matches:
            if match['away_team'] == team_name or match['home_team'] == team_name:
                team_matches.append(match)
        
        print(f"\n📊 {team_name} 參與的比賽: {len(team_matches)} 場")
        print("=" * 80)
        
        total_drinking_bonus = 0
        
        for i, match in enumerate(team_matches, 1):
            game_num = match['game_number']
            opponent = match['home_team'] if match['away_team'] == team_name else match['away_team']
            is_away = match['away_team'] == team_name
            
            drinking_bonus = match.get('drinking_bonus', {'away': 0, 'home': 0})
            team_drinking_bonus = drinking_bonus.get('away' if is_away else 'home', 0)
            
            # 計算SET得分來判定勝負
            sets = match.get('sets', [])
            away_set_total = 0
            home_set_total = 0
            
            for set_data in sets:
                away_players = set_data.get('away', [])
                home_players = set_data.get('home', [])
                winner = set_data.get('winner', '')
                
                if winner == 'away':
                    away_set_total += calculate_set_score(away_players)
                elif winner == 'home':
                    home_set_total += calculate_set_score(home_players)
            
            # 判定比賽結果（只看SET得分）
            if away_set_total > home_set_total:
                match_result = 'away_win'
            elif home_set_total > away_set_total:
                match_result = 'home_win'
            else:
                match_result = 'tie'  # SET得分平手就是和局
            
            # 計算最終總分（SET得分 + 飲酒加成）- 僅用於顯示
            away_final_score = away_set_total + drinking_bonus.get('away', 0)
            home_final_score = home_set_total + drinking_bonus.get('home', 0)
            
            # 飲酒加成不需要調整，直接使用原始值
            final_drinking_bonus = team_drinking_bonus
            
            result_text = "勝" if (is_away and match_result == 'away_win') or (not is_away and match_result == 'home_win') else "敗" if match_result != 'tie' else "平手"
            print(f"G{game_num:02d}: vs {opponent:<12} | {result_text} | 飲酒加成:{final_drinking_bonus} | SET得分: {away_set_total}-{home_set_total} | 最終: {away_final_score}-{home_final_score}")
            
            total_drinking_bonus += final_drinking_bonus
        
        print("=" * 80)
        print(f"📊 {team_name} 飲酒加成總計: {total_drinking_bonus}")
        
        return total_drinking_bonus
        
    except Exception as e:
        print(f"❌ 調試失敗: {e}")
        return None

def calculate_set_score(players):
    """計算SET得分（根據參賽人數）"""
    if isinstance(players, str):
        return 1  # 單人1分
    elif isinstance(players, list):
        return len(players)  # 雙人2分、三人3分、四人4分
    else:
        return 0

def main():
    if len(sys.argv) < 3:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑和隊伍名稱")
        print("使用方式: python3 debug_team_drinking_bonus.py <金鑰檔案路徑> <隊伍名稱>")
        print("隊伍名稱範例: 'Vivi朝酒晚舞', '海盜揪硬', '醉販', '酒空組', 'Jack', '逃生入口A', '逃生入口C', '人生揪難'")
        return
    
    service_account_path = sys.argv[1]
    team_name = sys.argv[2]
    
    print(f"🔍 調試 {team_name} 的飲酒加成計算")
    print("=" * 50)
    
    result = debug_team_drinking_bonus(service_account_path, team_name)
    
    if result is not None:
        print(f"\n✅ 調試完成，{team_name} 的飲酒加成總計: {result}")

if __name__ == '__main__':
    main() 