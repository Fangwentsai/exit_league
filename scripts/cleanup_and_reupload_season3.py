#!/usr/bin/env python3
"""
清理舊Firebase資料並重新上傳Season 3統計
"""

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

def cleanup_old_data(db):
    """清理舊的選手和隊伍資料"""
    print("🧹 清理舊的Firebase資料...")
    
    try:
        # 清理舊的 players/ collection
        print("  清理舊的選手資料...")
        players_ref = db.collection('players')
        players_docs = players_ref.stream()
        
        batch = db.batch()
        batch_count = 0
        
        for doc in players_docs:
            # 跳過season3文件（新結構）
            if doc.id != 'season3':
                batch.delete(doc.reference)
                batch_count += 1
                
                if batch_count >= 500:
                    batch.commit()
                    print(f"    已清理 {batch_count} 個選手文件...")
                    batch = db.batch()
                    batch_count = 0
        
        if batch_count > 0:
            batch.commit()
        
        print(f"✅ 舊選手資料清理完成")
        
        # 清理舊的 teams/ collection
        print("  清理舊的隊伍資料...")
        teams_ref = db.collection('teams')
        teams_docs = teams_ref.stream()
        
        batch = db.batch()
        batch_count = 0
        
        for doc in teams_docs:
            # 跳過season3文件（新結構）
            if doc.id != 'season3':
                batch.delete(doc.reference)
                batch_count += 1
                
                if batch_count >= 500:
                    batch.commit()
                    print(f"    已清理 {batch_count} 個隊伍文件...")
                    batch = db.batch()
                    batch_count = 0
        
        if batch_count > 0:
            batch.commit()
        
        print(f"✅ 舊隊伍資料清理完成")
        
        return True
        
    except Exception as e:
        print(f"❌ 清理資料失敗: {e}")
        return False

def main():
    print("🧹 Firebase資料清理與重新上傳工具")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 cleanup_and_reupload_season3.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    print(f"🔑 使用金鑰檔案: {service_account_path}")
    
    try:
        # 初始化Firebase
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 詢問是否確認清理
        response = input("\n❓ 確認要清理舊的選手和隊伍資料嗎？ (yes/Enter): ").strip().lower()
        if response != 'yes':
            print("❌ 清理已取消")
            return
        
        # 清理舊資料
        success = cleanup_old_data(db)
        
        if success:
            print("\n🎉 資料清理完成！")
            print("📋 請執行以下命令重新上傳統計資料:")
            print(f"python3 scripts/calculate_season3_statistics.py \"{service_account_path}\"")
        else:
            print("\n❌ 資料清理失敗")
            
    except Exception as e:
        print(f"❌ 執行過程中發生錯誤: {e}")

if __name__ == '__main__':
    main() 