#!/usr/bin/env python3
"""
Firebase選手名稱修正器 - 根據隊伍修正特定選手名稱
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
    print("請執行: pip install firebase-admin")
    sys.exit(1)

class FirebasePlayerCorrector:
    def __init__(self, service_account_path):
        self.service_account_path = service_account_path
        self.db = None
        
    def initialize_firebase(self):
        """初始化Firebase連接"""
        try:
            # 清除現有的Firebase app（如果存在）
            try:
                firebase_admin.delete_app(firebase_admin.get_app())
            except ValueError:
                pass
            
            cred = credentials.Certificate(self.service_account_path)
            firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            print("✅ Firebase連接成功")
            return True
            
        except Exception as e:
            print(f"❌ Firebase初始化失敗: {e}")
            return False
    
    def find_player_in_team_issues(self, old_name, new_name, target_teams):
        """查找特定隊伍中需要修正的選手名稱"""
        print(f"🔍 搜尋在隊伍 {target_teams} 中的 '{old_name}' → '{new_name}'...")
        
        issues_found = []
        seasons = ['season3', 'season4']
        
        for season in seasons:
            print(f"\n📁 檢查 {season.upper()}...")
            
            games_ref = self.db.collection('matches').document(season).collection('games')
            games = games_ref.stream()
            
            season_issues = []
            
            for game_doc in games:
                game_data = game_doc.to_dict()
                game_id = game_doc.id
                
                away_team = game_data.get('away_team', '')
                home_team = game_data.get('home_team', '')
                away_players = game_data.get('away_players', [])
                home_players = game_data.get('home_players', [])
                
                # 檢查客隊
                if away_team in target_teams and old_name in away_players:
                    issue = {
                        'season': season,
                        'game_id': game_id,
                        'game_number': game_data.get('game_number', 'Unknown'),
                        'date': game_data.get('date', 'Unknown'),
                        'teams': f"{away_team} vs {home_team}",
                        'team_type': 'away',
                        'team_name': away_team,
                        'away_players': away_players.copy(),
                        'home_players': home_players.copy()
                    }
                    season_issues.append(issue)
                
                # 檢查主隊
                if home_team in target_teams and old_name in home_players:
                    issue = {
                        'season': season,
                        'game_id': game_id,
                        'game_number': game_data.get('game_number', 'Unknown'),
                        'date': game_data.get('date', 'Unknown'),
                        'teams': f"{away_team} vs {home_team}",
                        'team_type': 'home',
                        'team_name': home_team,
                        'away_players': away_players.copy(),
                        'home_players': home_players.copy()
                    }
                    season_issues.append(issue)
                    
            print(f"   發現 {len(season_issues)} 場比賽需要修正")
            issues_found.extend(season_issues)
        
        return issues_found
    
    def fix_player_in_teams(self, old_name, new_name, target_teams, issues):
        """修正特定隊伍中的選手名稱"""
        if not issues:
            print(f"✅ 沒有發現在隊伍 {target_teams} 中需要修正的 '{old_name}'")
            return True
        
        print(f"\n🔧 開始修正隊伍 {target_teams} 中的 '{old_name}' → '{new_name}'...")
        print(f"📊 總計需要修正 {len(issues)} 場比賽")
        
        # 顯示需要修正的比賽
        print(f"\n📋 需要修正的比賽:")
        for i, issue in enumerate(issues[:10], 1):  # 顯示前10場
            team_indicator = "客隊" if issue['team_type'] == 'away' else "主隊"
            print(f"   {i}. {issue['season']}_g{issue['game_number']:03d}: {issue['teams']} ({team_indicator}: {issue['team_name']})")
        
        if len(issues) > 10:
            print(f"   ... 還有 {len(issues) - 10} 場比賽")
        
        response = input(f"\n❓ 確認要修正這 {len(issues)} 場比賽中的 '{old_name}' → '{new_name}' 嗎？(輸入 'yes' 確認): ").strip().lower()
        if response != 'yes':
            print("❌ 修正已取消")
            return False
        
        # 執行修正
        success_count = 0
        for issue in issues:
            try:
                # 取得文檔參考
                doc_ref = self.db.collection('matches').document(issue['season']).collection('games').document(issue['game_id'])
                
                # 修正選手名單
                updates = {}
                
                if issue['team_type'] == 'away':
                    new_away_players = [new_name if player == old_name else player for player in issue['away_players']]
                    updates['away_players'] = new_away_players
                elif issue['team_type'] == 'home':
                    new_home_players = [new_name if player == old_name else player for player in issue['home_players']]
                    updates['home_players'] = new_home_players
                
                # 同時檢查和修正 sets 中的選手名稱
                game_doc = doc_ref.get()
                if game_doc.exists:
                    game_full_data = game_doc.to_dict()
                    sets_data = game_full_data.get('sets', [])
                    
                    if sets_data:
                        updated_sets = []
                        sets_updated = False
                        
                        for set_data in sets_data:
                            updated_set = set_data.copy()
                            
                            # 修正 away 和 home 選手
                            if updated_set.get('away') == old_name:
                                updated_set['away'] = new_name
                                sets_updated = True
                            
                            if updated_set.get('home') == old_name:
                                updated_set['home'] = new_name
                                sets_updated = True
                            
                            updated_sets.append(updated_set)
                        
                        if sets_updated:
                            updates['sets'] = updated_sets
                
                # 添加更新時間戳
                updates['updated_at'] = firestore.SERVER_TIMESTAMP
                
                # 執行更新
                doc_ref.update(updates)
                success_count += 1
                
                print(f"   ✅ {issue['season']}_g{issue['game_number']:03d} 修正完成")
                
            except Exception as e:
                print(f"   ❌ {issue['season']}_g{issue['game_number']:03d} 修正失敗: {e}")
        
        print(f"\n🎉 修正完成！成功修正 {success_count}/{len(issues)} 場比賽")
        return success_count == len(issues)
    
    def correct_player_in_teams(self, old_name, new_name, target_teams):
        """修正特定隊伍中的選手名稱的主要方法"""
        print(f"🎯 修正選手名稱")
        print(f"👤 '{old_name}' → '{new_name}'")
        print(f"🏀 限定隊伍: {target_teams}")
        print("=" * 60)
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 查找問題
        issues = self.find_player_in_team_issues(old_name, new_name, target_teams)
        
        # 修正問題
        success = self.fix_player_in_teams(old_name, new_name, target_teams, issues)
        
        if success:
            print(f"\n✅ 在隊伍 {target_teams} 中的 '{old_name}' → '{new_name}' 修正完成！")
            print("🔗 請到Firebase Console確認修正結果")
        else:
            print(f"\n❌ 在隊伍 {target_teams} 中的 '{old_name}' → '{new_name}' 修正失敗！")
        
        return success

def main():
    print("🔧 Firebase選手名稱修正器")
    print("=" * 50)
    
    # 檢查參數
    if len(sys.argv) < 5:
        print("❌ 使用方式:")
        print("   python3 scripts/firebase_player_corrector.py <service_account_key.json> <old_name> <new_name> <team1> [team2] [team3]...")
        print()
        print("   例如:")
        print("     python3 scripts/firebase_player_corrector.py key.json '阿倫' '小倫' '逃生入口A'")
        print("     python3 scripts/firebase_player_corrector.py key.json '小孟' '孟瑄' '逃生入口A' '海盜揪硬'")
        sys.exit(1)
    
    service_account_path = sys.argv[1]
    old_name = sys.argv[2]
    new_name = sys.argv[3]
    target_teams = sys.argv[4:]  # 所有剩餘的參數都是隊伍名稱
    
    # 檢查金鑰檔案
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        sys.exit(1)
    
    # 建立修正器
    corrector = FirebasePlayerCorrector(service_account_path)
    
    # 執行修正
    success = corrector.correct_player_in_teams(old_name, new_name, target_teams)
    
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main() 