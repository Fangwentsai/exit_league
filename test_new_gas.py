#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測試新的 Google Apps Script 部署
"""

import json
import requests
from datetime import datetime

# 新的部署 URL（完整的）
SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBJwojHfXLvm_uMTd1aalSrKyD3pRjIJ5IJr0jpHFFNyMf8ga4mZ_74-p0RvCIYPro/exec'

def test_new_deployment():
    """測試新的部署"""
    print("🔍 測試新的 Google Apps Script 部署...")
    
    # 測試 GET 請求
    try:
        response = requests.get(SCRIPT_URL)
        print(f"GET 請求狀態: {response.status_code}")
        print(f"GET 回應: {response.text}")
        
        if response.status_code == 200:
            print("✅ GET 請求成功")
        else:
            print("❌ GET 請求失敗")
            return False
    except Exception as e:
        print(f"❌ GET 請求錯誤: {e}")
        return False
    
    # 測試 POST 請求
    print("\n🔍 測試 POST 請求...")
    
    test_data = {
        "gameId": "test_g01",
        "htmlContent": "<html><body><h1>測試 HTML</h1></body></html>",
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
        
        print(f"POST 請求狀態: {response.status_code}")
        print(f"POST 回應: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("✅ POST 請求成功")
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                print(f"   遊戲 ID: {result.get('gameId')}")
                print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                print(f"   統計工作表: {result.get('statsSheetName')}")
                
                if result.get('htmlSheetName') and result.get('statsSheetName'):
                    print("✅ 新功能已啟用！")
                    return True
                else:
                    print("❌ 新功能未啟用")
                    return False
            except json.JSONDecodeError:
                print("⚠️ 回應不是 JSON 格式")
                return False
        else:
            print("❌ POST 請求失敗")
            return False
            
    except Exception as e:
        print(f"❌ POST 請求錯誤: {e}")
        return False

def main():
    """主函數"""
    print("🚀 測試新的 Google Apps Script 部署")
    print("=" * 50)
    
    success = test_new_deployment()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ 新部署測試成功！")
        print("✅ HTML 和統計工作表功能已啟用")
    else:
        print("❌ 新部署測試失敗")
        print("   請檢查部署設定和權限")

if __name__ == "__main__":
    main()
