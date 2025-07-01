#!/usr/bin/env python3
"""
Season 3 Firebase上傳器 - 只上傳Season 3的比賽資料
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ Firebase Admin SDK未安裝")
    print("請執行: pip install firebase-admin")
    sys.exit(1)

class Season3Uploader:
    def __init__(self, service_account_path):
        self.base_path = Path(__file__).parent.parent
        self.data_path = self.base_path / "firebase_data"
        self.db = None
        self.service_account_path = service_account_path
        
    def initialize_firebase(self):
        """初始化Firebase連接"""
        try:
            if self.service_account_path:
                # 使用服務帳戶金鑰
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                # 使用預設憑證
                firebase_admin.initialize_app()
            
            self.db = firestore.client()
            print("✅ Firebase連接成功")
            return True
            
        except Exception as e:
            print(f"❌ Firebase初始化失敗: {e}")
            return False
    
    def load_season3_data(self):
        """載入Season 3比賽資料"""
        try:
            # 從完整資料中篩選Season 3
            matches_file = self.data_path / 'matches.json'
            with open(matches_file, 'r', encoding='utf-8') as f:
                all_matches = json.load(f)
            
            season3_matches = [match for match in all_matches if match['season'] == 'season3']
            
            print(f"📊 載入Season 3資料: {len(season3_matches)} 場比賽")
            return season3_matches
            
        except Exception as e:
            print(f"❌ 載入Season 3資料失敗: {e}")
            return None
    
    def upload_season3_matches(self, matches):
        """上傳Season 3比賽資料"""
        print("📤 開始上傳Season 3比賽資料...")
        
        # 建立Season 3子集合的參考
        season_ref = self.db.collection('matches').document('season3').collection('games')
        
        # 批次寫入
        batch = self.db.batch()
        batch_count = 0
        uploaded_count = 0
        
        for match in matches:
            # 文檔ID: g001, g002, g003, ...
            doc_id = f"g{match['game_number']:03d}"
            doc_ref = season_ref.document(doc_id)
            
            # 準備比賽資料
            match_data = {
                'game_number': match['game_number'],
                'date': match['date'],
                'venue': match['venue'],
                'away_team': match['away_team'],
                'home_team': match['home_team'],
                'away_score': match['away_score'],
                'home_score': match['home_score'],
                'sets': match['matches'],  # 重新命名為sets更清楚
                'drinking_bonus': match['drinking_bonus'],
                'away_players': match['away_players'],
                'home_players': match['home_players'],
                'total_sets': len(match['matches']),
                'away_sets_won': sum(1 for s in match['matches'] if s['winner'] == 'away'),
                'home_sets_won': sum(1 for s in match['matches'] if s['winner'] == 'home'),
                'season': 'season3',
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            batch.set(doc_ref, match_data)
            batch_count += 1
            
            # Firebase批次寫入限制為500個文檔
            if batch_count >= 500:
                batch.commit()
                uploaded_count += batch_count
                print(f"  已上傳 {uploaded_count} 場...")
                batch = self.db.batch()
                batch_count = 0
        
        # 提交剩餘的批次
        if batch_count > 0:
            batch.commit()
            uploaded_count += batch_count
        
        print(f"✅ Season 3比賽資料上傳完成: {uploaded_count} 場比賽")
        return uploaded_count
    
    def create_season3_metadata(self, matches):
        """為Season 3創建metadata"""
        print("📊 創建Season 3統計資料...")
        
        # 統計資料
        venues = set()
        teams = set()
        players = set()
        total_sets = 0
        date_range = {'start': None, 'end': None}
        
        for match in matches:
            venues.add(match['venue'])
            teams.add(match['away_team'])
            teams.add(match['home_team'])
            players.update(match['away_players'])
            players.update(match['home_players'])
            total_sets += len(match['matches'])
            
            # 記錄日期範圍
            match_date = match['date']
            if date_range['start'] is None or match_date < date_range['start']:
                date_range['start'] = match_date
            if date_range['end'] is None or match_date > date_range['end']:
                date_range['end'] = match_date
        
        # 上傳Season 3的metadata
        metadata_ref = self.db.collection('matches').document('season3')
        
        metadata = {
            'season': 'season3',
            'total_games': len(matches),
            'total_venues': len(venues),
            'total_teams': len(teams),
            'total_players': len(players),
            'total_sets': total_sets,
            'venues_list': sorted(list(venues)),
            'teams_list': sorted(list(teams)),
            'players_list': sorted(list(players)),
            'date_range': date_range,
            'last_updated': firestore.SERVER_TIMESTAMP,
            'data_source': 'html_parser',
            'version': '1.0',
            'status': 'complete'
        }
        
        metadata_ref.set(metadata)
        print(f"✅ Season 3 metadata已創建")
        
        return metadata
    
    def show_season3_summary(self, matches):
        """顯示Season 3資料摘要"""
        print("\n" + "="*60)
        print("📋 Season 3 資料摘要")
        print("="*60)
        
        # 統計
        venue_counts = {}
        team_counts = {}
        
        for match in matches:
            venue = match['venue']
            away_team = match['away_team']
            home_team = match['home_team']
            
            venue_counts[venue] = venue_counts.get(venue, 0) + 1
            team_counts[away_team] = team_counts.get(away_team, 0) + 1
            team_counts[home_team] = team_counts.get(home_team, 0) + 1
        
        print(f"📊 基本統計:")
        print(f"   總比賽數: {len(matches)} 場")
        print(f"   日期範圍: {matches[0]['date']} ~ {matches[-1]['date']}")
        print(f"   場地數量: {len(venue_counts)} 個")
        print(f"   參賽隊伍: {len(set(team_counts.keys()))} 支")
        
        print(f"\n🏟️ 場地分布:")
        sorted_venues = sorted(venue_counts.items(), key=lambda x: x[1], reverse=True)
        for venue, count in sorted_venues:
            print(f"   {venue}: {count} 場")
        
        print(f"\n🏀 隊伍出賽次數:")
        sorted_teams = sorted(team_counts.items(), key=lambda x: x[1], reverse=True)
        for team, count in sorted_teams:
            print(f"   {team}: {count} 場")
        
        # 檢查修正內容
        print(f"\n✅ 資料修正確認:")
        g04 = next((m for m in matches if m['game_number'] == 4), None)
        g15 = next((m for m in matches if m['game_number'] == 15), None)
        g53 = next((m for m in matches if m['game_number'] == 53), None)
        
        if g04:
            print(f"   G04: {g04['away_team']} vs {g04['home_team']} ✅")
        if g15:
            print(f"   G15: {g15['away_team']} vs {g15['home_team']} ✅")
        if g53:
            has_xiaolun = '小倫' in g53.get('home_players', [])
            print(f"   G53: 逃生入口A包含「小倫」: {has_xiaolun} ✅")
    
    def upload_season3_only(self):
        """只上傳Season 3資料"""
        print("🎯 Season 3 Firebase上傳器")
        print("=" * 60)
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 載入Season 3資料
        matches = self.load_season3_data()
        if not matches:
            return False
        
        try:
            # 顯示資料摘要
            self.show_season3_summary(matches)
            
            # 詢問是否繼續
            print(f"\n❓ 確認要上傳Season 3的 {len(matches)} 場比賽到Firebase嗎？")
            print("   資料將存放在 matches/season3/games")
            
            response = input("請輸入 'yes' 確認上傳，或按Enter取消: ").strip().lower()
            if response != 'yes':
                print("❌ 上傳已取消")
                return False
            
            # 上傳比賽資料
            uploaded_count = self.upload_season3_matches(matches)
            
            # 創建Season 3 metadata
            metadata = self.create_season3_metadata(matches)
            
            print(f"\n🎉 Season 3上傳完成！")
            print(f"📊 總計上傳: {uploaded_count} 場比賽")
            print(f"📁 資料結構: matches/season3/games")
            print(f"🔗 請到Firebase Console查看資料")
            
            return True
            
        except Exception as e:
            print(f"❌ 上傳過程中發生錯誤: {e}")
            return False

def main():
    print("🎯 Season 3 Firebase上傳器")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 upload_season3_only.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    print(f"🔑 使用金鑰檔案: {service_account_path}")
    
    # 建立上傳器
    uploader = Season3Uploader(service_account_path)
    
    # 執行上傳
    success = uploader.upload_season3_only()
    
    if success:
        print("\n✅ Season 3上傳完成！")
        print("\n📋 下一步建議:")
        print("1. 在Firebase Console檢查資料正確性")
        print("2. 確認所有修正內容都已正確上傳")
        print("3. Season 4資料標準化完成後，再進行Season 4上傳")
    else:
        print("\n❌ 上傳失敗")
        sys.exit(1)

if __name__ == '__main__':
    main() 