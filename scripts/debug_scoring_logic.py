#!/usr/bin/env python3
"""
調試計分邏輯
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

def calculate_set_score(players):
    """計算SET得分（根據參賽人數）"""
    if isinstance(players, str):
        return 1  # 單人1分
    elif isinstance(players, list):
        return len(players)  # 雙人2分、三人3分、四人4分
    else:
        return 0

def debug_scoring_logic(service_account_path):
    """調試計分邏輯"""
    print("🔍 調試計分邏輯")
    print("=" * 50)
    
    try:
        # 初始化Firebase
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 檢查前幾場比賽的詳細計分
        games_ref = db.collection('matches').document('season3').collection('games')
        games = games_ref.order_by('game_number').limit(5).stream()
        
        for game in games:
            game_data = game.to_dict()
            game_number = game_data.get('game_number')
            away_team = game_data.get('away_team')
            home_team = game_data.get('home_team')
            sets = game_data.get('sets', [])
            drinking_bonus = game_data.get('drinking_bonus', {'away': 0, 'home': 0})
            
            print(f"\n📊 G{game_number:02d}: {away_team} vs {home_team}")
            print(f"   飲酒加成: 客隊+{drinking_bonus.get('away', 0)}, 主隊+{drinking_bonus.get('home', 0)}")
            
            away_set_score = 0
            home_set_score = 0
            away_sets_won = 0
            home_sets_won = 0
            
            print(f"   局別詳情:")
            for i, set_data in enumerate(sets):
                away_players = set_data.get('away', [])
                home_players = set_data.get('home', [])
                winner = set_data.get('winner', '')
                set_type = set_data.get('type', '')
                
                away_score = calculate_set_score(away_players)
                home_score = calculate_set_score(home_players)
                
                away_set_score += away_score
                home_set_score += home_score
                
                if winner == 'away':
                    away_sets_won += 1
                elif winner == 'home':
                    home_sets_won += 1
                
                # 顯示前5局
                if i < 5:
                    print(f"     第{i+1}局({set_type}): 客{away_score}分 vs 主{home_score}分 → {winner}勝")
            
            print(f"   SET得分統計: 客隊{away_set_score}分, 主隊{home_set_score}分")
            print(f"   勝局統計: 客隊{away_sets_won}局, 主隊{home_sets_won}局")
            
            # 勝場加成邏輯檢查
            if away_set_score > home_set_score:
                print(f"   勝場加成: 客隊+1 (SET得分較高)")
                away_win_bonus = 1
                home_win_bonus = 0
            elif home_set_score > away_set_score:
                print(f"   勝場加成: 主隊+1 (SET得分較高)")
                away_win_bonus = 0
                home_win_bonus = 1
            else:
                print(f"   勝場加成: 無 (SET得分平手)")
                away_win_bonus = 0
                home_win_bonus = 0
            
            # 計算總分
            away_total = away_set_score + away_win_bonus + drinking_bonus.get('away', 0)
            home_total = home_set_score + home_win_bonus + drinking_bonus.get('home', 0)
            
            print(f"   總分計算:")
            print(f"     客隊: {away_set_score}(SET) + {away_win_bonus}(勝場) + {drinking_bonus.get('away', 0)}(飲酒) = {away_total}")
            print(f"     主隊: {home_set_score}(SET) + {home_win_bonus}(勝場) + {drinking_bonus.get('home', 0)}(飲酒) = {home_total}")
            
            if away_total > home_total:
                result = f"{away_team}獲勝"
            elif home_total > away_total:
                result = f"{home_team}獲勝"
            else:
                result = "平手"
            
            print(f"   比賽結果: {result}")
        
        print(f"\n✅ 調試完成！")
        
    except Exception as e:
        print(f"❌ 調試過程中發生錯誤: {e}")

def main():
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 debug_scoring_logic.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    debug_scoring_logic(service_account_path)

if __name__ == '__main__':
    main() 