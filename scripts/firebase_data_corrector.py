#!/usr/bin/env python3
"""
Firebase資料修正器 - 修正選手名稱等資料品質問題
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

class FirebaseDataCorrector:
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
    
    def find_player_name_issues(self, old_name, new_name):
        """查找需要修正的選手名稱"""
        print(f"🔍 搜尋所有包含 '{old_name}' 的比賽...")
        
        issues_found = []
        seasons = ['season3', 'season4']
        
        for season in seasons:
            print(f"\n📁 檢查 {season.upper()}...")
            
            # 取得該季節所有比賽
            games_ref = self.db.collection('matches').document(season).collection('games')
            games = games_ref.stream()
            
            season_issues = []
            
            for game_doc in games:
                game_data = game_doc.to_dict()
                game_id = game_doc.id
                
                # 檢查客隊選手
                away_players = game_data.get('away_players', [])
                home_players = game_data.get('home_players', [])
                
                # 檢查是否包含要修正的名字
                away_has_issue = old_name in away_players
                home_has_issue = old_name in home_players
                
                if away_has_issue or home_has_issue:
                    issue = {
                        'season': season,
                        'game_id': game_id,
                        'game_number': game_data.get('game_number', 'Unknown'),
                        'date': game_data.get('date', 'Unknown'),
                        'teams': f"{game_data.get('away_team', '')} vs {game_data.get('home_team', '')}",
                        'away_has_issue': away_has_issue,
                        'home_has_issue': home_has_issue,
                        'away_players': away_players,
                        'home_players': home_players
                    }
                    season_issues.append(issue)
                    
            print(f"   發現 {len(season_issues)} 場比賽包含 '{old_name}'")
            issues_found.extend(season_issues)
        
        return issues_found
    
    def fix_player_names(self, old_name, new_name, issues):
        """修正選手名稱"""
        if not issues:
            print(f"✅ 沒有發現需要修正的 '{old_name}' 選手名稱")
            return True
        
        print(f"\n🔧 開始修正 '{old_name}' → '{new_name}'...")
        print(f"📊 總計需要修正 {len(issues)} 場比賽")
        
        # 詢問確認
        print(f"\n📋 需要修正的比賽:")
        for i, issue in enumerate(issues[:5], 1):  # 只顯示前5場
            location = []
            if issue['away_has_issue']:
                location.append("客隊")
            if issue['home_has_issue']:
                location.append("主隊")
            
            print(f"   {i}. {issue['season']}_g{issue['game_number']:03d}: {issue['teams']} ({', '.join(location)})")
        
        if len(issues) > 5:
            print(f"   ... 還有 {len(issues) - 5} 場比賽")
        
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
                
                if issue['away_has_issue']:
                    new_away_players = [new_name if player == old_name else player for player in issue['away_players']]
                    updates['away_players'] = new_away_players
                
                if issue['home_has_issue']:
                    new_home_players = [new_name if player == old_name else player for player in issue['home_players']]
                    updates['home_players'] = new_home_players
                
                # 同時檢查sets中的選手名稱
                sets_data = issue.get('sets', [])
                if 'sets' not in issue:
                    # 重新取得完整資料
                    game_doc = doc_ref.get()
                    if game_doc.exists:
                        sets_data = game_doc.to_dict().get('sets', [])
                
                # 修正sets中的選手名稱
                updated_sets = []
                sets_updated = False
                
                for set_data in sets_data:
                    updated_set = set_data.copy()
                    
                    # 修正away_player和home_player
                    if updated_set.get('away_player') == old_name:
                        updated_set['away_player'] = new_name
                        sets_updated = True
                    
                    if updated_set.get('home_player') == old_name:
                        updated_set['home_player'] = new_name
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
    
    def correct_player_name(self, old_name, new_name):
        """修正特定選手名稱的主要方法"""
        print(f"🎯 修正選手名稱: '{old_name}' → '{new_name}'")
        print("=" * 60)
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 查找問題
        issues = self.find_player_name_issues(old_name, new_name)
        
        # 修正問題
        success = self.fix_player_names(old_name, new_name, issues)
        
        if success:
            print(f"\n✅ '{old_name}' → '{new_name}' 修正完成！")
            print("🔗 請到Firebase Console確認修正結果")
        else:
            print(f"\n❌ '{old_name}' → '{new_name}' 修正失敗！")
        
        return success

def main():
    print("🔧 Firebase資料修正器")
    print("=" * 50)
    
    # 檢查參數
    if len(sys.argv) < 4:
        print("❌ 使用方式:")
        print("   python3 scripts/firebase_data_corrector.py <service_account_key.json> <old_name> <new_name>")
        print("   例如: python3 scripts/firebase_data_corrector.py key.json '范姜姊' '范姜姐'")
        sys.exit(1)
    
    service_account_path = sys.argv[1]
    old_name = sys.argv[2]
    new_name = sys.argv[3]
    
    # 檢查金鑰檔案
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        sys.exit(1)
    
    # 建立修正器
    corrector = FirebaseDataCorrector(service_account_path)
    
    # 執行修正
    success = corrector.correct_player_name(old_name, new_name)
    
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main() 