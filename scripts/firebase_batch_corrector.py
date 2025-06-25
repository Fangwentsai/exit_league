#!/usr/bin/env python3
"""
Firebase批量資料修正器 - 支援場地名稱、隊伍名稱等多欄位批量修正
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

class FirebaseBatchCorrector:
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
    
    def find_field_issues(self, field_name, old_value, new_value):
        """查找需要修正的欄位"""
        print(f"🔍 搜尋所有包含 '{field_name}: {old_value}' 的比賽...")
        
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
                
                # 檢查指定欄位是否需要修正
                current_value = game_data.get(field_name)
                
                if current_value == old_value:
                    issue = {
                        'season': season,
                        'game_id': game_id,
                        'game_number': game_data.get('game_number', 'Unknown'),
                        'date': game_data.get('date', 'Unknown'),
                        'teams': f"{game_data.get('away_team', '')} vs {game_data.get('home_team', '')}",
                        'current_value': current_value,
                        'field_name': field_name
                    }
                    season_issues.append(issue)
                    
            print(f"   發現 {len(season_issues)} 場比賽包含 '{field_name}: {old_value}'")
            issues_found.extend(season_issues)
        
        return issues_found
    
    def fix_field_values(self, field_name, old_value, new_value, issues):
        """修正指定欄位的值"""
        if not issues:
            print(f"✅ 沒有發現需要修正的 '{field_name}: {old_value}'")
            return True
        
        print(f"\n🔧 開始修正 '{field_name}: {old_value}' → '{new_value}'...")
        print(f"📊 總計需要修正 {len(issues)} 場比賽")
        
        # 顯示需要修正的比賽
        print(f"\n📋 需要修正的比賽:")
        for i, issue in enumerate(issues[:5], 1):  # 只顯示前5場
            print(f"   {i}. {issue['season']}_g{issue['game_number']:03d}: {issue['teams']}")
        
        if len(issues) > 5:
            print(f"   ... 還有 {len(issues) - 5} 場比賽")
        
        response = input(f"\n❓ 確認要修正這 {len(issues)} 場比賽中的 '{field_name}: {old_value}' → '{new_value}' 嗎？(輸入 'yes' 確認): ").strip().lower()
        if response != 'yes':
            print("❌ 修正已取消")
            return False
        
        # 執行修正
        success_count = 0
        for issue in issues:
            try:
                # 取得文檔參考
                doc_ref = self.db.collection('matches').document(issue['season']).collection('games').document(issue['game_id'])
                
                # 修正欄位值
                updates = {
                    field_name: new_value,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }
                
                # 執行更新
                doc_ref.update(updates)
                success_count += 1
                
                print(f"   ✅ {issue['season']}_g{issue['game_number']:03d} 修正完成")
                
            except Exception as e:
                print(f"   ❌ {issue['season']}_g{issue['game_number']:03d} 修正失敗: {e}")
        
        print(f"\n🎉 修正完成！成功修正 {success_count}/{len(issues)} 場比賽")
        return success_count == len(issues)
    
    def correct_field_value(self, field_name, old_value, new_value):
        """修正特定欄位值的主要方法"""
        print(f"🎯 修正欄位: {field_name}")
        print(f"📝 '{old_value}' → '{new_value}'")
        print("=" * 60)
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 查找問題
        issues = self.find_field_issues(field_name, old_value, new_value)
        
        # 修正問題
        success = self.fix_field_values(field_name, old_value, new_value, issues)
        
        if success:
            print(f"\n✅ '{field_name}: {old_value}' → '{new_value}' 修正完成！")
            print("🔗 請到Firebase Console確認修正結果")
        else:
            print(f"\n❌ '{field_name}: {old_value}' → '{new_value}' 修正失敗！")
        
        return success
    
    def batch_correct_venues(self):
        """批量修正場地名稱"""
        print("🏟️ 批量修正場地名稱")
        print("=" * 60)
        
        # 場地名稱修正對應表
        venue_corrections = {
            '逃生入口Exit Bar': '逃生入口 Bar',
            '逃生入口Bar': '逃生入口 Bar',
            '逃生入口吧': '逃生入口 Bar',
            'ViVi Bar': 'Vivi Bar',
            'Jack Bar': 'Jack',
            'Jack Bar (飲酒平手+2)': 'Jack',
        }
        
        total_success = 0
        total_attempts = 0
        
        for old_venue, new_venue in venue_corrections.items():
            print(f"\n{'='*50}")
            success = self.correct_field_value('venue', old_venue, new_venue)
            total_attempts += 1
            if success:
                total_success += 1
        
        print(f"\n🎉 場地名稱批量修正完成！")
        print(f"📊 成功修正 {total_success}/{total_attempts} 個場地名稱")
        
        return total_success == total_attempts
    
    def batch_correct_teams(self):
        """批量修正隊伍名稱"""
        print("🏀 批量修正隊伍名稱")
        print("=" * 60)
        
        # 隊伍名稱修正對應表
        team_corrections = {
            'ViVi朝酒晚舞': 'Vivi朝酒晚舞',
            '海盜揪硬': '酒窩海盜聯盟',
            '海盜揪難': '酒窩海盜聯盟',
            '人生揪硬': '人生揪難',
        }
        
        total_success = 0
        total_attempts = 0
        
        # 需要檢查的欄位（客隊和主隊）
        team_fields = ['away_team', 'home_team']
        
        for field in team_fields:
            print(f"\n📊 修正 {field} 欄位...")
            for old_team, new_team in team_corrections.items():
                print(f"\n{'-'*30}")
                success = self.correct_field_value(field, old_team, new_team)
                total_attempts += 1
                if success:
                    total_success += 1
        
        print(f"\n🎉 隊伍名稱批量修正完成！")
        print(f"📊 成功修正 {total_success}/{total_attempts} 個隊伍名稱修正")
        
        return total_success == total_attempts

def main():
    print("🔧 Firebase批量資料修正器")
    print("=" * 50)
    
    # 檢查參數
    if len(sys.argv) < 3:
        print("❌ 使用方式:")
        print("   python3 scripts/firebase_batch_corrector.py <service_account_key.json> <action>")
        print("   action 選項:")
        print("     venues  - 批量修正場地名稱")
        print("     teams   - 批量修正隊伍名稱")
        print("     field <field_name> <old_value> <new_value> - 修正特定欄位")
        print()
        print("   例如:")
        print("     python3 scripts/firebase_batch_corrector.py key.json venues")
        print("     python3 scripts/firebase_batch_corrector.py key.json teams")
        print("     python3 scripts/firebase_batch_corrector.py key.json field venue '逃生入口Bar' '逃生入口 Bar'")
        sys.exit(1)
    
    service_account_path = sys.argv[1]
    action = sys.argv[2]
    
    # 檢查金鑰檔案
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        sys.exit(1)
    
    # 建立修正器
    corrector = FirebaseBatchCorrector(service_account_path)
    
    # 執行相應動作
    success = False
    
    if action == 'venues':
        success = corrector.batch_correct_venues()
    elif action == 'teams':
        success = corrector.batch_correct_teams()
    elif action == 'field' and len(sys.argv) >= 6:
        field_name = sys.argv[3]
        old_value = sys.argv[4]
        new_value = sys.argv[5]
        success = corrector.correct_field_value(field_name, old_value, new_value)
    else:
        print("❌ 無效的動作或參數不足")
        print("請使用 venues、teams 或 field <field_name> <old_value> <new_value>")
        sys.exit(1)
    
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main() 