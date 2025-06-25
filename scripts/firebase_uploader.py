#!/usr/bin/env python3
"""
Firebase資料上傳器 - 將解析的JSON資料上傳到Firebase Firestore
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

class FirebaseUploader:
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
    
    def load_json_data(self):
        """載入JSON資料"""
        try:
            # 載入比賽資料
            matches_file = self.data_path / 'matches.json'
            with open(matches_file, 'r', encoding='utf-8') as f:
                matches = json.load(f)
            
            # 載入選手資料
            players_file = self.data_path / 'players.json'
            with open(players_file, 'r', encoding='utf-8') as f:
                players = json.load(f)
            
            # 載入摘要資料
            summary_file = self.data_path / 'summary.json'
            with open(summary_file, 'r', encoding='utf-8') as f:
                summary = json.load(f)
            
            print(f"📊 載入資料: {len(matches)} 場比賽, {len(players)} 位選手")
            return matches, players, summary
            
        except Exception as e:
            print(f"❌ 載入JSON資料失敗: {e}")
            return None, None, None
    
    def upload_matches(self, matches):
        """上傳比賽資料到Firestore"""
        print("📤 開始上傳比賽資料...")
        
        # 建立matches集合
        matches_ref = self.db.collection('matches')
        
        # 批次寫入
        batch = self.db.batch()
        batch_count = 0
        total_uploaded = 0
        
        for match in matches:
            # 建立文檔ID: season_gameNumber (例如: season3_001)
            doc_id = f"{match['season']}_g{match['game_number']:03d}"
            doc_ref = matches_ref.document(doc_id)
            
            # 準備資料 (Firebase不支援某些Python類型，需要轉換)
            match_data = {
                'season': match['season'],
                'game_number': match['game_number'],
                'date': match['date'],
                'venue': match['venue'],
                'away_team': match['away_team'],
                'home_team': match['home_team'],
                'away_score': match['away_score'],
                'home_score': match['home_score'],
                'matches': match['matches'],
                'drinking_bonus': match['drinking_bonus'],
                'away_players': match['away_players'],
                'home_players': match['home_players'],
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            batch.set(doc_ref, match_data)
            batch_count += 1
            
            # Firebase批次寫入限制為500個文檔
            if batch_count >= 500:
                batch.commit()
                total_uploaded += batch_count
                print(f"  已上傳 {total_uploaded} 場比賽...")
                batch = self.db.batch()
                batch_count = 0
        
        # 提交剩餘的批次
        if batch_count > 0:
            batch.commit()
            total_uploaded += batch_count
        
        print(f"✅ 比賽資料上傳完成: {total_uploaded} 場比賽")
    
    def upload_players(self, players):
        """上傳選手資料到Firestore"""
        print("📤 開始上傳選手資料...")
        
        # 建立players集合
        players_ref = self.db.collection('players')
        
        # 批次寫入
        batch = self.db.batch()
        batch_count = 0
        total_uploaded = 0
        
        for player_name, player_data in players.items():
            # 使用選手名稱作為文檔ID
            doc_ref = players_ref.document(player_name)
            
            # 準備資料
            player_doc = {
                'name': player_data['name'],
                'total_games': player_data['total_games'],
                'total_wins': player_data['total_wins'],
                'o1_games': player_data['o1_games'],
                'o1_wins': player_data['o1_wins'],
                'cr_games': player_data['cr_games'],
                'cr_wins': player_data['cr_wins'],
                'first_attacks': player_data['first_attacks'],
                'seasons': player_data['seasons'],
                'teams': player_data['teams'],
                'win_rate': round(player_data['total_wins'] / player_data['total_games'] * 100, 2) if player_data['total_games'] > 0 else 0,
                'o1_win_rate': round(player_data['o1_wins'] / player_data['o1_games'] * 100, 2) if player_data['o1_games'] > 0 else 0,
                'cr_win_rate': round(player_data['cr_wins'] / player_data['cr_games'] * 100, 2) if player_data['cr_games'] > 0 else 0,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            
            batch.set(doc_ref, player_doc)
            batch_count += 1
            
            # Firebase批次寫入限制
            if batch_count >= 500:
                batch.commit()
                total_uploaded += batch_count
                print(f"  已上傳 {total_uploaded} 位選手...")
                batch = self.db.batch()
                batch_count = 0
        
        # 提交剩餘的批次
        if batch_count > 0:
            batch.commit()
            total_uploaded += batch_count
        
        print(f"✅ 選手資料上傳完成: {total_uploaded} 位選手")
    
    def upload_summary(self, summary):
        """上傳摘要資料到Firestore"""
        print("📤 上傳摘要資料...")
        
        # 建立metadata集合
        metadata_ref = self.db.collection('metadata')
        doc_ref = metadata_ref.document('summary')
        
        summary_data = {
            'total_matches': summary['total_matches'],
            'total_players': summary['total_players'],
            'seasons': summary['seasons'],
            'players_list': summary['players_list'],
            'last_updated': firestore.SERVER_TIMESTAMP,
            'data_source': 'html_parser',
            'version': '1.0'
        }
        
        doc_ref.set(summary_data)
        print("✅ 摘要資料上傳完成")
    
    def create_indexes(self):
        """建立常用的索引 (需要在Firebase Console手動建立)"""
        print("📋 建議在Firebase Console建立以下索引:")
        print("1. matches集合:")
        print("   - season (升序) + game_number (升序)")
        print("   - venue (升序) + date (升序)")
        print("   - away_team (升序) + date (升序)")
        print("   - home_team (升序) + date (升序)")
        print()
        print("2. players集合:")
        print("   - total_games (降序)")
        print("   - total_wins (降序)")
        print("   - win_rate (降序)")
        print("   - seasons (陣列包含) + total_games (降序)")
        print("   - teams (陣列包含) + total_wins (降序)")
    
    def upload_all(self):
        """上傳所有資料"""
        print("🚀 開始上傳所有資料到Firebase...")
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 載入資料
        matches, players, summary = self.load_json_data()
        if not matches or not players or not summary:
            return False
        
        try:
            # 上傳資料
            self.upload_matches(matches)
            self.upload_players(players)
            self.upload_summary(summary)
            
            # 顯示索引建議
            self.create_indexes()
            
            print(f"\n🎉 所有資料上傳完成！")
            print(f"📊 總計: {len(matches)} 場比賽, {len(players)} 位選手")
            print(f"🔗 請到Firebase Console查看資料")
            
            return True
            
        except Exception as e:
            print(f"❌ 上傳過程中發生錯誤: {e}")
            return False

def main():
    print("🎯 Firebase資料上傳器")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    service_account_path = None
    if len(sys.argv) > 1:
        service_account_path = sys.argv[1]
        if not Path(service_account_path).exists():
            print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
            return
    
    # 建立上傳器
    uploader = FirebaseUploader(service_account_path)
    
    # 執行上傳
    success = uploader.upload_all()
    
    if success:
        print("\n✅ 上傳完成！")
    else:
        print("\n❌ 上傳失敗")
        sys.exit(1)

if __name__ == '__main__':
    main() 