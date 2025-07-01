#!/usr/bin/env python3
"""
調試Firebase比賽資料
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

def debug_firebase_data(service_account_path):
    """調試Firebase資料"""
    print("🔍 調試Firebase比賽資料")
    print("=" * 50)
    
    try:
        # 初始化Firebase
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 檢查第一場比賽的詳細資料
        print("\n📊 檢查第一場比賽 (G01):")
        games_ref = db.collection('matches').document('season3').collection('games')
        game1 = games_ref.where('game_number', '==', 1).limit(1).stream()
        
        for game in game1:
            game_data = game.to_dict()
            print(f"  比賽編號: {game_data.get('game_number')}")
            print(f"  客隊: {game_data.get('away_team')}")
            print(f"  主隊: {game_data.get('home_team')}")
            print(f"  客隊選手: {game_data.get('away_players', [])}")
            print(f"  主隊選手: {game_data.get('home_players', [])}")
            
            matches = game_data.get('matches', [])
            print(f"  總局數: {len(matches)}")
            
            away_wins = 0
            home_wins = 0
            
            print(f"  局別詳情:")
            for i, match_set in enumerate(matches[:5]):  # 只顯示前5局
                set_type = match_set.get('type', '')
                away_player = match_set.get('away', '')
                home_player = match_set.get('home', '')
                winner = match_set.get('winner', '')
                
                if winner == 'away':
                    away_wins += 1
                elif winner == 'home':
                    home_wins += 1
                
                print(f"    第{i+1}局 ({set_type}): {away_player} vs {home_player} → 勝者: {winner}")
            
            print(f"  前5局統計: 客隊{away_wins}勝，主隊{home_wins}勝")
            
            # 計算所有局數的勝負
            total_away_wins = sum(1 for m in matches if m.get('winner') == 'away')
            total_home_wins = sum(1 for m in matches if m.get('winner') == 'home')
            
            print(f"  全場統計: 客隊{total_away_wins}勝，主隊{total_home_wins}勝")
            print(f"  比賽勝者: {'客隊' if total_away_wins > total_home_wins else '主隊'}")
            
            break
        
        print("\n✅ 調試完成！")
        
    except Exception as e:
        print(f"❌ 調試過程中發生錯誤: {e}")

def main():
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 debug_firebase_data.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    debug_firebase_data(service_account_path)

if __name__ == '__main__':
    main() 