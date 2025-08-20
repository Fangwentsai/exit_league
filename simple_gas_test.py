#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
簡單的 Google Apps Script 測試
"""

import json
import requests
from datetime import datetime

SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec'

def test_simple():
    """簡單測試"""
    print("🔍 簡單測試 Google Apps Script...")
    
    # 測試資料
    test_data = {
        "test": True,
        "htmlContent": "<html><body><h1>測試</h1></body></html>",
        "playerStats": {
            "away": [{"name": "測試選手", "o1Games": 1, "o1Wins": 1, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 1, "firstAttacks": 0}],
            "home": [{"name": "測試選手2", "o1Games": 1, "o1Wins": 0, "crGames": 0, "crWins": 0, "totalGames": 1, "totalWins": 0, "firstAttacks": 1}]
        },
        "htmlSheetName": "test_html",
        "statsSheetName": "test_stats"
    }
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(test_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
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
            print("❌ 請求失敗")
            return False
            
    except Exception as e:
        print(f"❌ 錯誤: {e}")
        return False

if __name__ == "__main__":
    test_simple()

