#!/usr/bin/env python3
"""
調試單場比賽的計算邏輯
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

def debug_single_match(service_account_path, game_number):
    """調試單場比賽"""
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
        print(f"📋 比賽 {doc_id} 詳細資料:")
        print(f"  日期: {match['date']}")
        print(f"  場地: {match['venue']}")
        print(f"  對戰: {match['away_team']} vs {match['home_team']}")
        print(f"  原始分數: {match['away_score']} - {match['home_score']}")
        
        # 檢查飲酒加成
        drinking_bonus = match.get('drinking_bonus', {'away': 0, 'home': 0})
        print(f"  飲酒加成: away={drinking_bonus.get('away', 0)}, home={drinking_bonus.get('home', 0)}")
        
        # 計算SET得分
        sets = match.get('sets', [])
        print(f"\n📊 SET分析 (共{len(sets)}個SET):")
        
        away_set_total = 0
        home_set_total = 0
        
        for i, set_data in enumerate(sets, 1):
            away_players = set_data.get('away', [])
            home_players = set_data.get('home', [])
            winner = set_data.get('winner', 'unknown')
            
            # 計算SET得分 - 只有獲勝方才得分
            away_score = 0
            home_score = 0
            
            if winner == 'away':
                away_score = calculate_set_score(away_players)
                away_set_total += away_score
            elif winner == 'home':
                home_score = calculate_set_score(home_players)
                home_set_total += home_score
            
            print(f"  SET {i}: {away_players} vs {home_players} - 勝者: {winner} - 得分: away={away_score}, home={home_score}")
        
        print(f"\n📈 SET總分:")
        print(f"  {match['away_team']}: {away_set_total} 分")
        print(f"  {match['home_team']}: {home_set_total} 分")
        
        # 判定勝負
        if away_set_total > home_set_total:
            match_result = 'away_win'
            print(f"  🏆 比賽結果: {match['away_team']} 勝")
        elif home_set_total > away_set_total:
            match_result = 'home_win'
            print(f"  🏆 比賽結果: {match['home_team']} 勝")
        else:
            match_result = 'tie'
            print(f"  🤝 比賽結果: 平手")
        
        # 處理飲酒加成的特殊邏輯
        away_drinking_bonus = drinking_bonus.get('away', 0)
        home_drinking_bonus = drinking_bonus.get('home', 0)
        
        print(f"\n🍺 飲酒加成處理:")
        print(f"  原始飲酒加成: away={away_drinking_bonus}, home={home_drinking_bonus}")
        
        # 檢查是否是平手且有飲酒加成的特殊情況
        if match_result == 'tie' and (away_drinking_bonus == 5 or home_drinking_bonus == 5):
            print("  ⚠️  發現平手且有飲酒加成的特殊情況")
            if away_drinking_bonus == 5:
                away_drinking_bonus = 2
                print(f"    {match['away_team']} 飲酒加成調整為: {away_drinking_bonus}")
            if home_drinking_bonus == 5:
                home_drinking_bonus = 2
                print(f"    {match['home_team']} 飲酒加成調整為: {home_drinking_bonus}")
        
        print(f"  最終飲酒加成: away={away_drinking_bonus}, home={home_drinking_bonus}")
        
        return {
            'game_number': game_number,
            'away_team': match['away_team'],
            'home_team': match['home_team'],
            'away_set_total': away_set_total,
            'home_set_total': home_set_total,
            'away_drinking_bonus': away_drinking_bonus,
            'home_drinking_bonus': home_drinking_bonus,
            'match_result': match_result
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
        print("使用方式: python3 debug_single_match.py <金鑰檔案路徑> <比賽編號>")
        return
    
    service_account_path = sys.argv[1]
    game_number = int(sys.argv[2])
    
    print(f"🔍 調試比賽 G{game_number:03d}")
    print("=" * 50)
    
    result = debug_single_match(service_account_path, game_number)
    
    if result:
        print("\n" + "=" * 50)
        print("📊 調試結果摘要:")
        print(f"  比賽: {result['away_team']} vs {result['home_team']}")
        print(f"  SET得分: {result['away_set_total']} - {result['home_set_total']}")
        print(f"  飲酒加成: {result['away_drinking_bonus']} - {result['home_drinking_bonus']}")
        print(f"  比賽結果: {result['match_result']}")

if __name__ == '__main__':
    main() 