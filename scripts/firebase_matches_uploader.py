#!/usr/bin/env python3
"""
Firebase Matches上傳器 - 只上傳比賽資料，按季節分類
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

class MatchesUploader:
    def __init__(self, service_account_path=None):
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
                # 使用預設憑證 (需要設定環境變數)
                firebase_admin.initialize_app()
            
            self.db = firestore.client()
            print("✅ Firebase連接成功")
            return True
            
        except Exception as e:
            print(f"❌ Firebase初始化失敗: {e}")
            return False
    
    def load_matches_data(self):
        """載入比賽資料"""
        try:
            matches_file = self.data_path / 'matches.json'
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches = json.load(f)
            
            print(f"📊 載入比賽資料: {len(matches)} 場比賽")
            return matches
            
        except Exception as e:
            print(f"❌ 載入比賽資料失敗: {e}")
            return None
    
    def upload_matches_by_season(self, matches):
        """按季節上傳比賽資料"""
        print("📤 開始按季節上傳比賽資料...")
        
        # 按季節分組
        season_matches = {'season3': [], 'season4': []}
        for match in matches:
            season = match['season']
            if season in season_matches:
                season_matches[season].append(match)
        
        total_uploaded = 0
        
        for season, season_match_list in season_matches.items():
            if not season_match_list:
                continue
                
            print(f"\n📁 上傳 {season.upper()} ({len(season_match_list)} 場比賽)...")
            
            # 建立季節子集合的參考
            season_ref = self.db.collection('matches').document(season).collection('games')
            
            # 批次寫入
            batch = self.db.batch()
            batch_count = 0
            season_uploaded = 0
            
            for match in season_match_list:
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
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }
                
                batch.set(doc_ref, match_data)
                batch_count += 1
                
                # Firebase批次寫入限制為500個文檔
                if batch_count >= 500:
                    batch.commit()
                    season_uploaded += batch_count
                    print(f"  已上傳 {season_uploaded} 場...")
                    batch = self.db.batch()
                    batch_count = 0
            
            # 提交剩餘的批次
            if batch_count > 0:
                batch.commit()
                season_uploaded += batch_count
            
            print(f"✅ {season.upper()} 上傳完成: {season_uploaded} 場比賽")
            total_uploaded += season_uploaded
        
        return total_uploaded
    
    def create_season_metadata(self, matches):
        """為每個季節創建metadata"""
        print("📊 創建季節統計資料...")
        
        season_stats = {}
        
        for match in matches:
            season = match['season']
            if season not in season_stats:
                season_stats[season] = {
                    'total_games': 0,
                    'venues': set(),
                    'teams': set(),
                    'players': set(),
                    'total_sets': 0,
                    'date_range': {'start': None, 'end': None}
                }
            
            stats = season_stats[season]
            stats['total_games'] += 1
            stats['venues'].add(match['venue'])
            stats['teams'].add(match['away_team'])
            stats['teams'].add(match['home_team'])
            stats['players'].update(match['away_players'])
            stats['players'].update(match['home_players'])
            stats['total_sets'] += len(match['matches'])
            
            # 記錄日期範圍
            match_date = match['date']
            if stats['date_range']['start'] is None or match_date < stats['date_range']['start']:
                stats['date_range']['start'] = match_date
            if stats['date_range']['end'] is None or match_date > stats['date_range']['end']:
                stats['date_range']['end'] = match_date
        
        # 上傳每個季節的metadata
        for season, stats in season_stats.items():
            metadata_ref = self.db.collection('matches').document(season)
            
            metadata = {
                'season': season,
                'total_games': stats['total_games'],
                'total_venues': len(stats['venues']),
                'total_teams': len(stats['teams']),
                'total_players': len(stats['players']),
                'total_sets': stats['total_sets'],
                'venues_list': sorted(list(stats['venues'])),
                'teams_list': sorted(list(stats['teams'])),
                'players_list': sorted(list(stats['players'])),
                'date_range': stats['date_range'],
                'last_updated': firestore.SERVER_TIMESTAMP,
                'data_source': 'html_parser',
                'version': '1.0'
            }
            
            metadata_ref.set(metadata)
            print(f"✅ {season.upper()} metadata已創建")
    
    def show_data_summary(self, matches):
        """顯示資料摘要供檢查"""
        print("\n" + "="*60)
        print("📋 資料摘要檢查")
        print("="*60)
        
        # 按季節統計
        season_counts = {}
        venue_counts = {}
        team_counts = {}
        
        for match in matches:
            season = match['season']
            venue = match['venue']
            away_team = match['away_team']
            home_team = match['home_team']
            
            season_counts[season] = season_counts.get(season, 0) + 1
            venue_counts[venue] = venue_counts.get(venue, 0) + 1
            team_counts[away_team] = team_counts.get(away_team, 0) + 1
            team_counts[home_team] = team_counts.get(home_team, 0) + 1
        
        print(f"📊 季節分布:")
        for season, count in sorted(season_counts.items()):
            print(f"   {season}: {count} 場比賽")
        
        print(f"\n🏟️ 場地分布 (前5名):")
        sorted_venues = sorted(venue_counts.items(), key=lambda x: x[1], reverse=True)
        for venue, count in sorted_venues[:5]:
            print(f"   {venue}: {count} 場")
        
        print(f"\n🏀 隊伍分布 (前8名):")
        sorted_teams = sorted(team_counts.items(), key=lambda x: x[1], reverse=True)
        for team, count in sorted_teams[:8]:
            print(f"   {team}: {count} 場")
        
        # 檢查可能的資料問題
        print(f"\n⚠️  資料品質檢查:")
        
        # 檢查隊名變異
        similar_teams = self.find_similar_team_names(list(team_counts.keys()))
        if similar_teams:
            print(f"   🔍 可能重複的隊名:")
            for group in similar_teams:
                print(f"      {group}")
        
        # 檢查場地名稱變異
        similar_venues = self.find_similar_venue_names(list(venue_counts.keys()))
        if similar_venues:
            print(f"   🔍 可能重複的場地名:")
            for group in similar_venues:
                print(f"      {group}")
    
    def find_similar_team_names(self, team_names):
        """找出可能重複的隊名"""
        similar_groups = []
        processed = set()
        
        for team in team_names:
            if team in processed:
                continue
                
            similar = [team]
            for other_team in team_names:
                if other_team != team and other_team not in processed:
                    # 簡單的相似度檢查
                    if (team in other_team or other_team in team or 
                        abs(len(team) - len(other_team)) <= 2):
                        similar.append(other_team)
            
            if len(similar) > 1:
                similar_groups.append(similar)
                processed.update(similar)
        
        return similar_groups
    
    def find_similar_venue_names(self, venue_names):
        """找出可能重複的場地名"""
        similar_groups = []
        processed = set()
        
        for venue in venue_names:
            if venue in processed:
                continue
                
            similar = [venue]
            for other_venue in venue_names:
                if other_venue != venue and other_venue not in processed:
                    # 檢查相似場地名
                    if (venue.replace(' ', '') in other_venue.replace(' ', '') or 
                        other_venue.replace(' ', '') in venue.replace(' ', '')):
                        similar.append(other_venue)
            
            if len(similar) > 1:
                similar_groups.append(similar)
                processed.update(similar)
        
        return similar_groups
    
    def upload_matches_only(self):
        """只上傳比賽資料"""
        print("🎯 Firebase Matches上傳器 - 只上傳比賽資料")
        print("=" * 60)
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 載入比賽資料
        matches = self.load_matches_data()
        if not matches:
            return False
        
        try:
            # 顯示資料摘要
            self.show_data_summary(matches)
            
            # 詢問是否繼續
            print(f"\n❓ 確認要上傳 {len(matches)} 場比賽到Firebase嗎？")
            print("   資料將按季節分類存放在 matches/season3/games 和 matches/season4/games")
            
            response = input("請輸入 'yes' 確認上傳，或按Enter取消: ").strip().lower()
            if response != 'yes':
                print("❌ 上傳已取消")
                return False
            
            # 上傳比賽資料
            total_uploaded = self.upload_matches_by_season(matches)
            
            # 創建季節metadata
            self.create_season_metadata(matches)
            
            print(f"\n🎉 上傳完成！")
            print(f"📊 總計上傳: {total_uploaded} 場比賽")
            print(f"📁 資料結構: matches/season3/games 和 matches/season4/games")
            print(f"🔗 請到Firebase Console查看資料")
            
            return True
            
        except Exception as e:
            print(f"❌ 上傳過程中發生錯誤: {e}")
            return False

def main():
    print("🎯 Firebase Matches上傳器")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    service_account_path = None
    if len(sys.argv) > 1:
        service_account_path = sys.argv[1]
        if not Path(service_account_path).exists():
            print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
            return
    
    # 建立上傳器
    uploader = MatchesUploader(service_account_path)
    
    # 執行上傳
    success = uploader.upload_matches_only()
    
    if success:
        print("\n✅ 上傳完成！")
        print("\n📋 下一步建議:")
        print("1. 在Firebase Console檢查資料正確性")
        print("2. 修正任何發現的隊名或場地名稱問題")
        print("3. 確認資料無誤後，再進行選手統計")
    else:
        print("\n❌ 上傳失敗")
        sys.exit(1)

if __name__ == '__main__':
    main() 