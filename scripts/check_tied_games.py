#!/usr/bin/env python3
"""
檢查平手或勝負判定問題的比賽
"""

import sys
from pathlib import Path

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ Firebase Admin SDK未安裝")
    sys.exit(1)

def check_tied_games(service_account_path):
    """檢查平手比賽"""
    print("🔍 檢查平手或勝負判定問題的比賽")
    print("=" * 50)
    
    try:
        # 初始化Firebase
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 檢查所有比賽
        games_ref = db.collection('matches').document('season3').collection('games')
        games = games_ref.order_by('game_number').stream()
        
        tied_games = []
        total_games = 0
        
        for game in games:
            game_data = game.to_dict()
            total_games += 1
            
            sets = game_data.get('sets', [])
            away_wins = sum(1 for s in sets if s.get('winner') == 'away')
            home_wins = sum(1 for s in sets if s.get('winner') == 'home')
            
            # 檢查是否平手
            if away_wins == home_wins:
                tied_games.append({
                    'game_number': game_data.get('game_number'),
                    'away_team': game_data.get('away_team'),
                    'home_team': game_data.get('home_team'),
                    'away_wins': away_wins,
                    'home_wins': home_wins,
                    'total_sets': len(sets)
                })
        
        print(f"\n📊 檢查結果:")
        print(f"   總比賽數: {total_games}")
        print(f"   平手比賽數: {len(tied_games)}")
        
        if tied_games:
            print(f"\n⚖️ 平手比賽詳情:")
            for game in tied_games:
                print(f"   G{game['game_number']:02d}: {game['away_team']} vs {game['home_team']}")
                print(f"        客隊{game['away_wins']}局，主隊{game['home_wins']}局 (總{game['total_sets']}局)")
        else:
            print("   ✅ 沒有平手比賽")
        
        print(f"\n✅ 檢查完成！")
        
    except Exception as e:
        print(f"❌ 檢查過程中發生錯誤: {e}")

def main():
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 check_tied_games.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    check_tied_games(service_account_path)

if __name__ == '__main__':
    main() 