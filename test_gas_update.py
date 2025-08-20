#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
檢查 Google Apps Script 是否已更新的測試腳本
"""

import json
import requests
from datetime import datetime

# 配置
SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec'

def test_gas_version():
    """測試 Google Apps Script 版本"""
    print("🔍 檢查 Google Apps Script 版本...")
    
    # 測試 GET 請求
    try:
        response = requests.get(SCRIPT_URL)
        print(f"GET 請求狀態: {response.status_code}")
        print(f"完整回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ GET 請求成功")
                print(f"   狀態: {data.get('status')}")
                print(f"   訊息: {data.get('message')}")
                print(f"   時間戳記: {data.get('timestamp')}")
                print(f"   方法: {data.get('method')}")
                
                # 檢查是否有新版本的標識
                if 'version' in data or 'updated' in data.get('message', '').lower():
                    print("✅ 檢測到新版本 Google Apps Script")
                    return True
                else:
                    print("⚠️ 可能是舊版本 Google Apps Script")
                    return False
                    
            except json.JSONDecodeError:
                print("⚠️ GET 回應不是 JSON 格式")
                return False
        else:
            print("❌ GET 請求失敗")
            return False
    except Exception as e:
        print(f"❌ GET 請求錯誤: {e}")
        return False

def test_new_features():
    """測試新功能"""
    print("\n🔍 測試新功能...")
    
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    
    # 測試包含新欄位的資料
    test_data = {
        "gameId": "g01",
        "homeTeam": "逃生入口A",
        "awayTeam": "酒空組",
        "selectedPlayers": {
            1: {"away": ["Lucas"], "home": ["小倫"]}
        },
        "firstAttackData": {1: "home"},
        "winLoseData": {1: "away"},
        "bonusTeam": "home",
        "scores": {
            "home": {"original": 8, "winBonus": 1, "drinkBonus": 5, "total": 14},
            "away": {"original": 8, "winBonus": 0, "drinkBonus": 0, "total": 8}
        },
        "timestamp": datetime.now().isoformat(),
        "htmlContent": f"<html><body><h1>測試 HTML {timestamp}</h1></body></html>",
        "playerStats": {
            "away": [{"name": "Lucas", "o1Games": 1, "o1Wins": 1, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 1, "firstAttacks": 0}],
            "home": [{"name": "小倫", "o1Games": 1, "o1Wins": 0, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 0, "firstAttacks": 1}]
        },
        "htmlSheetName": f"g01_{timestamp}",
        "statsSheetName": f"result_{timestamp}"
    }
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(test_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"POST 請求結果:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   完整回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                print(f"   遊戲 ID: {result.get('gameId')}")
                print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                print(f"   統計工作表: {result.get('statsSheetName')}")
                
                # 檢查是否有新功能的回應
                if result.get('htmlSheetName') and result.get('statsSheetName'):
                    print("✅ 新功能正常運作！")
                    return True
                else:
                    print("❌ 新功能未正常運作")
                    return False
                    
            except json.JSONDecodeError:
                print("   回應不是 JSON 格式")
                if "html" in response.text.lower() or "stats" in response.text.lower():
                    print("✅ 可能新功能已運作（回應包含相關關鍵字）")
                    return True
                else:
                    print("❌ 新功能可能未運作")
                    return False
        else:
            print(f"❌ HTTP 錯誤: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 請求錯誤: {e}")
        return False

def main():
    """主測試函數"""
    print("🚀 檢查 Google Apps Script 更新狀態")
    print("=" * 50)
    
    # 檢查版本
    version_updated = test_gas_version()
    
    # 測試新功能
    features_working = test_new_features()
    
    print("\n" + "=" * 50)
    print("📋 檢查結果:")
    
    if version_updated and features_working:
        print("✅ Google Apps Script 已成功更新並正常運作！")
        print("✅ 新功能（HTML 和統計工作表）已啟用")
    elif features_working:
        print("✅ 新功能正常運作，但版本檢查不確定")
    elif version_updated:
        print("⚠️ 版本已更新，但新功能可能未完全運作")
    else:
        print("❌ Google Apps Script 可能尚未更新")
        print("   請確認已按照 google_apps_script_setup.md 更新程式碼")
        print("   並重新部署 Google Apps Script")
    
    print("\n🏁 檢查完成")

if __name__ == "__main__":
    main()

