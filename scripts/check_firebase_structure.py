#!/usr/bin/env python3
"""
檢查Firebase資料結構
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

def check_firebase_structure(service_account_path):
    """檢查Firebase資料結構"""
    try:
        # 初始化Firebase
        if service_account_path:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
        
        db = firestore.client()
        print("✅ Firebase連接成功")
        
        # 檢查頂層集合
        print("\n📋 檢查頂層集合:")
        collections = db.collections()
        for collection in collections:
            print(f"  - {collection.id}")
        
        # 檢查matches集合
        print("\n📋 檢查matches集合:")
        matches_ref = db.collection('matches')
        matches_docs = matches_ref.stream()
        
        for doc in matches_docs:
            print(f"  - Document: {doc.id}")
            
            # 檢查子集合
            subcollections = doc.reference.collections()
            for subcol in subcollections:
                print(f"    - Subcollection: {subcol.id}")
                
                # 檢查子集合中的文檔數量
                subdocs = list(subcol.stream())
                print(f"      - Documents count: {len(subdocs)}")
                
                if len(subdocs) > 0:
                    # 顯示前幾個文檔的ID
                    sample_ids = [d.id for d in subdocs[:3]]
                    print(f"      - Sample IDs: {sample_ids}")
        
        # 特別檢查season3
        print("\n📋 特別檢查season3:")
        try:
            season3_ref = db.collection('matches').document('season3')
            season3_doc = season3_ref.get()
            
            if season3_doc.exists:
                print("  ✅ season3 document exists")
                
                # 檢查games子集合
                games_ref = season3_ref.collection('games')
                games = list(games_ref.stream())
                print(f"  📊 games子集合中有 {len(games)} 個文檔")
                
                if len(games) > 0:
                    # 顯示第一個遊戲的資料結構
                    first_game = games[0]
                    game_data = first_game.to_dict()
                    print(f"  📋 第一個遊戲 ({first_game.id}) 的資料結構:")
                    for key, value in game_data.items():
                        if isinstance(value, list) and len(value) > 0:
                            print(f"    - {key}: [{len(value)} items] - {type(value[0])}")
                        else:
                            print(f"    - {key}: {type(value)} - {value}")
            else:
                print("  ❌ season3 document does not exist")
                
        except Exception as e:
            print(f"  ❌ 檢查season3時發生錯誤: {e}")
        
    except Exception as e:
        print(f"❌ Firebase檢查失敗: {e}")

def main():
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 check_firebase_structure.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    print("🔍 檢查Firebase資料結構")
    print("=" * 50)
    print(f"🔑 使用金鑰檔案: {service_account_path}")
    
    check_firebase_structure(service_account_path)

if __name__ == '__main__':
    main() 