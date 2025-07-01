#!/usr/bin/env python3
"""
詳細調試比賽數據，檢查客隊主隊和SET得分的對應關係
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

def debug_match_details(service_account_path, game_number):
    """詳細調試單場比賽的數據結構"""
    try:
        # 初始化Firebase
        if service_account_path:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
        
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 載入指定比賽
        doc_id = f"g{game_number:03d}"
        game_ref = db.collection('matches').document('season3').collection('games').document(doc_id)
        game_doc = game_ref.get()
        
        if not game_doc.exists:
            print(f"❌ 比賽 {doc_id} 不存在")
            return
        
        match = game_doc.to_dict()
        
        print(f"🔍 比賽 G{game_number:03d} 詳細數據檢查")
        print("=" * 80)
        print(f"📅 日期: {match['date']}")
        print(f"🏟️ 場地: {match['venue']}")
        print(f"🏀 客隊 (away): {match['away_team']}")
        print(f"🏠 主隊 (home): {match['home_team']}")
        print(f"📊 原始分數: away={match['away_score']}, home={match['home_score']}")
        
        # 檢查飲酒加成
        drinking_bonus = match.get('drinking_bonus', {'away': 0, 'home': 0})
        print(f"🍺 飲酒加成: away={drinking_bonus.get('away', 0)}, home={drinking_bonus.get('home', 0)}")
        
        # 詳細分析每個SET
        sets = match.get('sets', [])
        print(f"\n📋 SET詳細分析 (共{len(sets)}個SET):")
        print("-" * 80)
        
        away_set_total = 0
        home_set_total = 0
        away_wins = 0
        home_wins = 0
        
        for i, set_data in enumerate(sets, 1):
            away_players = set_data.get('away', [])
            home_players = set_data.get('home', [])
            winner = set_data.get('winner', 'unknown')
            set_type = set_data.get('type', 'unknown')
            
            # 計算SET得分
            away_score = 0
            home_score = 0
            
            if winner == 'away':
                away_score = calculate_set_score(away_players)
                away_set_total += away_score
                away_wins += 1
            elif winner == 'home':
                home_score = calculate_set_score(home_players)
                home_set_total += home_score
                home_wins += 1
            
            print(f"  SET {i:2d} ({set_type}): {away_players} vs {home_players}")
            print(f"         勝者: {winner} | 得分: away={away_score}, home={home_score}")
        
        print("-" * 80)
        print(f"📊 SET統計總結:")
        print(f"  {match['away_team']} (客隊): {away_set_total}分 ({away_wins}勝)")
        print(f"  {match['home_team']} (主隊): {home_set_total}分 ({home_wins}勝)")
        
        # 判定勝負
        if away_set_total > home_set_total:
            match_result = f"{match['away_team']} 勝"
            winner_team = match['away_team']
        elif home_set_total > away_set_total:
            match_result = f"{match['home_team']} 勝"
            winner_team = match['home_team']
        else:
            match_result = "平手"
            winner_team = "平手"
        
        print(f"🏆 比賽結果: {match_result}")
        
        # 計算最終總分
        away_final = away_set_total + (1 if away_set_total > home_set_total else 0) + drinking_bonus.get('away', 0)
        home_final = home_set_total + (1 if home_set_total > away_set_total else 0) + drinking_bonus.get('home', 0)
        
        print(f"\n💯 最終總分計算:")
        print(f"  {match['away_team']}: {away_set_total}(SET) + {1 if away_set_total > home_set_total else 0}(勝場) + {drinking_bonus.get('away', 0)}(飲酒) = {away_final}")
        print(f"  {match['home_team']}: {home_set_total}(SET) + {1 if home_set_total > away_set_total else 0}(勝場) + {drinking_bonus.get('home', 0)}(飲酒) = {home_final}")
        
        return {
            'game_number': game_number,
            'away_team': match['away_team'],
            'home_team': match['home_team'],
            'away_set_total': away_set_total,
            'home_set_total': home_set_total,
            'away_drinking_bonus': drinking_bonus.get('away', 0),
            'home_drinking_bonus': drinking_bonus.get('home', 0),
            'match_result': winner_team,
            'away_final': away_final,
            'home_final': home_final
        }
        
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
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑和比賽編號")
        print("使用方式: python3 debug_match_details.py <金鑰檔案路徑> <比賽編號>")
        return
    
    service_account_path = sys.argv[1]
    game_number = int(sys.argv[2])
    
    result = debug_match_details(service_account_path, game_number)

if __name__ == '__main__':
    main() 