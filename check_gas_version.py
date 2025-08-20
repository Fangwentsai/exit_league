#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
檢查 Google Apps Script 版本
"""

import json
import requests
from datetime import datetime

SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec'

def check_version():
    """檢查版本"""
    print("🔍 檢查 Google Apps Script 版本...")
    
    # 測試 GET 請求
    try:
        response = requests.get(SCRIPT_URL)
        print(f"GET 回應: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ 版本檢查成功")
                print(f"   狀態: {data.get('status')}")
                print(f"   訊息: {data.get('message')}")
                print(f"   時間戳記: {data.get('timestamp')}")
                
                # 檢查是否有版本資訊
                if 'version' in data or 'updated' in data.get('message', '').lower():
                    print("✅ 檢測到新版本")
                    return True
                else:
                    print("⚠️ 可能是舊版本")
                    return False
            except:
                print("⚠️ 回應格式異常")
                return False
        else:
            print("❌ GET 請求失敗")
            return False
    except Exception as e:
        print(f"❌ 版本檢查錯誤: {e}")
        return False

def test_new_features():
    """測試新功能"""
    print("\n🔍 測試新功能...")
    
    # 測試資料
    test_data = {
        "gameId": "test_g01",
        "htmlContent": "<html><body><h1>測試</h1></body></html>",
        "playerStats": {
            "away": [{"name": "測試選手", "o1Games": 1, "o1Wins": 1, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 1, "firstAttacks": 0}],
            "home": [{"name": "測試選手2", "o1Games": 1, "o1Wins": 0, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 0, "firstAttacks": 1}]
        },
        "htmlSheetName": "test_html_sheet",
        "statsSheetName": "test_stats_sheet"
    }
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(test_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"POST 回應: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ POST 成功")
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                print(f"   遊戲 ID: {result.get('gameId')}")
                print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                print(f"   統計工作表: {result.get('statsSheetName')}")
                
                if result.get('htmlSheetName') or result.get('statsSheetName'):
                    print("✅ 新功能已啟用！")
                    return True
                else:
                    print("❌ 新功能未啟用")
                    return False
            except:
                print("⚠️ 回應格式異常")
                return False
        else:
            print("❌ POST 失敗")
            return False
    except Exception as e:
        print(f"❌ 新功能測試錯誤: {e}")
        return False

def main():
    """主函數"""
    print("🚀 檢查 Google Apps Script 更新狀態")
    print("=" * 50)
    
    version_ok = check_version()
    features_ok = test_new_features()
    
    print("\n" + "=" * 50)
    print("📋 檢查結果:")
    
    if version_ok and features_ok:
        print("✅ Google Apps Script 已成功更新！")
        print("✅ 新功能已啟用")
    elif features_ok:
        print("✅ 新功能已啟用（版本檢查不確定）")
    elif version_ok:
        print("⚠️ 版本已更新，但新功能可能未完全運作")
    else:
        print("❌ Google Apps Script 可能尚未更新")
        print("\n🔧 請確認以下步驟：")
        print("1. 已完全替換 Google Apps Script 程式碼")
        print("2. 已重新部署（新增版本）")
        print("3. 試算表 ID 正確：1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE")
        print("4. 有足夠的寫入權限")
        print("5. 等待幾分鐘讓更新生效")

if __name__ == "__main__":
    main()

