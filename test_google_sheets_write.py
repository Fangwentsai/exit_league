#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Sheets API 寫入測試腳本
測試 HTML 和選手統計資料的寫入功能
"""

import json
import requests
from datetime import datetime
import time

# 配置
SPREADSHEET_ID = '1V2hj-9R-C2GWYu6Wo-por-gNvm56vGFPjx4ELcx3XtE'
SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec'

def test_google_apps_script():
    """測試 Google Apps Script 連接"""
    print("🔍 測試 Google Apps Script 連接...")
    
    # 測試 GET 請求
    try:
        response = requests.get(SCRIPT_URL)
        print(f"GET 請求狀態: {response.status_code}")
        print(f"回應內容: {response.text[:100]}...")
        
        if response.status_code == 200:
            print("✅ Google Apps Script 基本連接成功！")
            return True
        else:
            print("❌ Google Apps Script 連接失敗")
            return False
    except Exception as e:
        print(f"❌ Google Apps Script 連接錯誤: {e}")
        return False

def test_data_write():
    """測試資料寫入功能"""
    print("\n🔍 測試資料寫入功能...")
    
    # 生成測試資料
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    game_code = "g01"
    
    test_data = {
        "gameId": game_code,
        "homeTeam": "逃生入口A",
        "awayTeam": "酒空組",
        "selectedPlayers": {
            1: {"away": ["Lucas"], "home": ["小倫"]},
            2: {"away": ["Eric"], "home": ["Ace"]},
            3: {"away": ["傑西"], "home": ["華華"]}
        },
        "firstAttackData": {
            1: "home",
            2: "away", 
            3: "home"
        },
        "winLoseData": {
            1: "away",
            2: "home",
            3: "away"
        },
        "bonusTeam": "home",
        "scores": {
            "home": {
                "original": 8,
                "winBonus": 1,
                "drinkBonus": 5,
                "total": 14
            },
            "away": {
                "original": 8,
                "winBonus": 0,
                "drinkBonus": 0,
                "total": 8
            }
        },
        "timestamp": datetime.now().isoformat(),
        "htmlContent": f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>測試 HTML 內容</title>
</head>
<body>
    <h1>測試比賽結果</h1>
    <p>這是一個測試的 HTML 內容</p>
    <p>時間戳記: {timestamp}</p>
</body>
</html>""",
        "playerStats": {
            "away": [
                {
                    "name": "Lucas",
                    "o1Games": 1,
                    "o1Wins": 1,
                    "crGames": 0,
                    "crWins": 0,
                    "totalGames": 1,
                    "totalWins": 1,
                    "firstAttacks": 0
                }
            ],
            "home": [
                {
                    "name": "小倫",
                    "o1Games": 1,
                    "o1Wins": 0,
                    "crGames": 0,
                    "crWins": 0,
                    "totalGames": 1,
                    "totalWins": 0,
                    "firstAttacks": 1
                }
            ]
        },
        "htmlSheetName": f"{game_code}_{timestamp}",
        "statsSheetName": f"result_{timestamp}",
        "timestamp": timestamp
    }
    
    print(f"📊 準備發送測試資料:")
    print(f"   HTML 工作表: {test_data['htmlSheetName']}")
    print(f"   統計工作表: {test_data['statsSheetName']}")
    
    try:
        # 發送 POST 請求到 Google Apps Script
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(test_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"\n📤 發送請求結果:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                if result.get('status') == 'success':
                    print("✅ 資料寫入成功！")
                    print(f"   遊戲 ID: {result.get('gameId')}")
                    print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                    print(f"   統計工作表: {result.get('statsSheetName')}")
                    return True
                else:
                    print(f"❌ 寫入失敗: {result.get('message', '未知錯誤')}")
                    return False
            except json.JSONDecodeError:
                print("⚠️ 回應不是有效的 JSON 格式")
                if "success" in response.text.lower():
                    print("✅ 可能寫入成功（回應包含 'success'）")
                    return True
                else:
                    print("❌ 寫入可能失敗")
                    return False
        else:
            print(f"❌ HTTP 錯誤: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ 請求超時")
        return False
    except Exception as e:
        print(f"❌ 請求錯誤: {e}")
        return False

def test_simple_write():
    """測試簡單的資料寫入"""
    print("\n🔍 測試簡單資料寫入...")
    
    simple_data = {
        "test": True,
        "message": "這是一個簡單的測試",
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(simple_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"簡單測試結果:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應內容: {response.text}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ 簡單測試錯誤: {e}")
        return False

def main():
    """主測試函數"""
    print("🚀 開始 Google Sheets 寫入測試")
    print("=" * 50)
    
    # 測試 Google Apps Script 基本連接
    if not test_google_apps_script():
        print("\n❌ Google Apps Script 連接失敗，停止測試")
        return
    
    # 測試簡單寫入
    if not test_simple_write():
        print("\n❌ 簡單寫入測試失敗")
        return
    
    # 測試完整資料寫入
    if test_data_write():
        print("\n✅ 所有測試通過！")
    else:
        print("\n❌ 完整資料寫入測試失敗")
    
    print("\n" + "=" * 50)
    print("🏁 測試完成")

if __name__ == "__main__":
    main()
