#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測試新的 Google Apps Script URL
"""

import json
import requests
from datetime import datetime

# 新的 Google Apps Script URL
NEW_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw96zr198osWO2HIeFbKMaHaM3-WqkHcDJ1F_OmTJdulf3Euv2E9K7LrdRpMORMr5lW/exec'

def test_get_request():
    """測試 GET 請求"""
    print("🔍 測試 GET 請求...")
    try:
        response = requests.get(NEW_SCRIPT_URL, timeout=10)
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ GET 請求錯誤: {e}")
        return False

def test_post_request():
    """測試 POST 請求"""
    print("\n🔍 測試 POST 請求...")
    
    test_data = {
        "action": "test",
        "gameId": "TEST_G01",
        "homeTeam": "測試主場",
        "awayTeam": "測試客場",
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(
            NEW_SCRIPT_URL,
            data=json.dumps(test_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ POST 請求成功")
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                return True
            except json.JSONDecodeError:
                print("⚠️ 回應不是 JSON 格式")
                return False
        else:
            print("❌ POST 請求失敗")
            return False
            
    except Exception as e:
        print(f"❌ POST 請求錯誤: {e}")
        return False

def test_full_data():
    """測試完整的比賽資料"""
    print("\n🔍 測試完整比賽資料...")
    
    full_data = {
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
        "htmlContent": "<html><body><h1>測試 HTML</h1></body></html>",
        "playerStats": {
            "away": [{"name": "Lucas", "o1Games": 1, "o1Wins": 1, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 1, "firstAttacks": 0}],
            "home": [{"name": "小倫", "o1Games": 1, "o1Wins": 0, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 0, "firstAttacks": 1}]
        }
    }
    
    try:
        response = requests.post(
            NEW_SCRIPT_URL,
            data=json.dumps(full_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ 完整資料測試成功")
                print(f"   狀態: {result.get('status')}")
                print(f"   訊息: {result.get('message')}")
                print(f"   遊戲 ID: {result.get('gameId')}")
                return True
            except json.JSONDecodeError:
                print("⚠️ 回應不是 JSON 格式")
                return False
        else:
            print("❌ 完整資料測試失敗")
            return False
            
    except Exception as e:
        print(f"❌ 完整資料測試錯誤: {e}")
        return False

def main():
    """主測試函數"""
    print("🚀 開始測試新的 Google Apps Script")
    print("=" * 50)
    
    # 測試 GET 請求
    get_success = test_get_request()
    
    # 測試 POST 請求
    post_success = test_post_request()
    
    # 測試完整資料
    full_success = test_full_data()
    
    print("\n" + "=" * 50)
    print("📊 測試結果總結:")
    print(f"GET 請求: {'✅ 成功' if get_success else '❌ 失敗'}")
    print(f"POST 請求: {'✅ 成功' if post_success else '❌ 失敗'}")
    print(f"完整資料: {'✅ 成功' if full_success else '❌ 失敗'}")
    
    if get_success and post_success and full_success:
        print("\n🎉 所有測試都成功！Google Apps Script 運作正常")
    else:
        print("\n⚠️ 部分測試失敗，請檢查 Google Apps Script 設定")

if __name__ == "__main__":
    main()

