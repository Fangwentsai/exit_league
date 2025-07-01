#!/usr/bin/env python3
"""
驗證Season 3統計資料
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

def verify_statistics(service_account_path):
    """驗證統計資料"""
    print("🔍 驗證Season 3統計資料")
    print("=" * 50)
    
    try:
        # 初始化Firebase
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 檢查隊伍戰績
        print("\n📊 隊伍戰績檢查:")
        teams_ref = db.collection('teams').document('season3').collection('teams')
        teams = teams_ref.stream()
        
        total_games_check = 0
        total_wins_check = 0
        
        for team in teams:
            team_data = team.to_dict()
            team_name = team_data.get('name', team.id)
            season3_stats = team_data.get('season3', {})
            
            wins = season3_stats.get('wins', 0)
            losses = season3_stats.get('losses', 0)
            total_games = season3_stats.get('total_games', 0)
            win_rate = season3_stats.get('win_rate', 0)
            sets_won = season3_stats.get('sets_won', 0)
            sets_lost = season3_stats.get('sets_lost', 0)
            
            print(f"  {team_name}:")
            print(f"    戰績: {wins}勝{losses}敗 (勝率: {win_rate}%)")
            print(f"    局數: 贏{sets_won}局，輸{sets_lost}局")
            print(f"    總比賽數: {total_games}")
            
            total_games_check += total_games
            total_wins_check += wins
        
        print(f"\n📋 總計檢查:")
        print(f"  所有隊伍總比賽數: {total_games_check} (應該是 112，因為56場比賽×2隊)")
        print(f"  所有隊伍總勝場數: {total_wins_check} (應該是 56，因為每場比賽有1個勝者)")
        
        # 檢查選手統計
        print(f"\n👥 選手統計檢查:")
        players_ref = db.collection('players').document('season3').collection('players')
        players = players_ref.limit(5).stream()  # 只檢查前5位選手
        
        for player in players:
            player_data = player.to_dict()
            player_name = player_data.get('name', player.id)
            season3_stats = player_data.get('season3', {})
            
            total_sets = season3_stats.get('total_sets', 0)
            total_wins = season3_stats.get('total_wins', 0)
            win_rate = season3_stats.get('win_rate', 0)
            teams = player_data.get('teams', [])
            
            print(f"  {player_name} ({'/'.join(teams)}):")
            print(f"    {total_wins}勝{total_sets-total_wins}敗 (勝率: {win_rate}%)")
        
        # 檢查排行榜
        print(f"\n🏆 排行榜檢查:")
        rankings_ref = db.collection('statistics').document('season3')
        rankings_doc = rankings_ref.get()
        
        if rankings_doc.exists:
            rankings = rankings_doc.to_dict()
            team_standings = rankings.get('team_standings', [])
            
            print(f"  隊伍排行榜 (前3名):")
            for i, team in enumerate(team_standings[:3]):
                rank = team.get('rank', i+1)
                name = team.get('name', '')
                wins = team.get('wins', 0)
                losses = team.get('losses', 0)
                win_rate = team.get('win_rate', 0)
                
                print(f"    {rank}. {name}: {wins}勝{losses}敗 (勝率: {win_rate}%)")
        
        print(f"\n✅ 統計資料驗證完成！")
        
    except Exception as e:
        print(f"❌ 驗證過程中發生錯誤: {e}")

def main():
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 verify_season3_stats.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    verify_statistics(service_account_path)

if __name__ == '__main__':
    main() 