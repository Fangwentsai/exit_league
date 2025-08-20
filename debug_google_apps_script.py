#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Apps Script 調試腳本
檢查現有的 Google Apps Script 實作
"""

import json
import requests
from datetime import datetime

# 配置
SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec'

def test_current_script():
    """測試現有的 Google Apps Script 功能"""
    print("🔍 測試現有的 Google Apps Script 功能...")
    
    # 測試 GET 請求
    try:
        response = requests.get(SCRIPT_URL)
        print(f"GET 請求狀態: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ GET 請求成功，回應格式正確")
                print(f"   狀態: {data.get('status')}")
                print(f"   訊息: {data.get('message')}")
                print(f"   時間戳記: {data.get('timestamp')}")
                return True
            except json.JSONDecodeError:
                print("⚠️ GET 回應不是 JSON 格式")
                return False
        else:
            print("❌ GET 請求失敗")
            return False
    except Exception as e:
        print(f"❌ GET 請求錯誤: {e}")
        return False

def test_legacy_format():
    """測試舊格式的資料"""
    print("\n🔍 測試舊格式資料...")
    
    legacy_data = {
        "gameId": "g01",
        "homeTeam": "逃生入口A",
        "awayTeam": "酒空組",
        "selectedPlayers": {
            1: {"away": ["Lucas"], "home": ["小倫"]},
            2: {"away": ["Eric"], "home": ["Ace"]}
        },
        "firstAttackData": {
            1: "home",
            2: "away"
        },
        "winLoseData": {
            1: "away",
            2: "home"
        },
        "bonusTeam": "home",
        "scores": {
            "home": {"original": 8, "winBonus": 1, "drinkBonus": 5, "total": 14},
            "away": {"original": 8, "winBonus": 0, "drinkBonus": 0, "total": 8}
        },
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(legacy_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"舊格式測試結果:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                print(f"   遊戲 ID: {result.get('gameId')}")
                print(f"   寫入行數: {result.get('rowsWritten')}")
            except json.JSONDecodeError:
                print("   回應不是 JSON 格式")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ 舊格式測試錯誤: {e}")
        return False

def test_new_format():
    """測試新格式的資料（包含 HTML 和統計）"""
    print("\n🔍 測試新格式資料...")
    
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    
    new_data = {
        "gameId": "g01",
        "homeTeam": "逃生入口A",
        "awayTeam": "酒空組",
        "selectedPlayers": {
            1: {"away": ["Lucas"], "home": ["小倫"]},
            2: {"away": ["Eric"], "home": ["Ace"]}
        },
        "firstAttackData": {
            1: "home",
            2: "away"
        },
        "winLoseData": {
            1: "away",
            2: "home"
        },
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
            data=json.dumps(new_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"新格式測試結果:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                print(f"   遊戲 ID: {result.get('gameId')}")
                print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                print(f"   統計工作表: {result.get('statsSheetName')}")
            except json.JSONDecodeError:
                print("   回應不是 JSON 格式")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ 新格式測試錯誤: {e}")
        return False

def main():
    """主調試函數"""
    print("🚀 開始 Google Apps Script 調試")
    print("=" * 50)
    
    # 測試基本功能
    if not test_current_script():
        print("\n❌ 基本功能測試失敗")
        return
    
    # 測試舊格式
    if not test_legacy_format():
        print("\n❌ 舊格式測試失敗")
        return
    
    # 測試新格式
    if not test_new_format():
        print("\n❌ 新格式測試失敗")
        return
    
    print("\n" + "=" * 50)
    print("🏁 調試完成")
    print("\n📋 結論:")
    print("1. Google Apps Script 可以正常接收資料")
    print("2. 舊格式資料可以正常處理")
    print("3. 新格式資料需要更新 Google Apps Script 程式碼")
    print("4. 請參考 google_apps_script_setup.md 更新 Google Apps Script")

if __name__ == "__main__":
    main()

