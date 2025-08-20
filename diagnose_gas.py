#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Apps Script 診斷腳本
"""

import json
import requests
from datetime import datetime

SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG06esXLPr-jbZKS9lCVfVYN3Gfl9ag4WDdjfHYMivMPmGbMaZR3rioOfJhofpBFX8/exec'

def test_get_request():
    """測試 GET 請求"""
    print("🔍 測試 GET 請求...")
    
    try:
        response = requests.get(SCRIPT_URL)
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ GET 請求成功")
                return True
            except:
                print("⚠️ 回應不是 JSON 格式")
                return False
        else:
            print("❌ GET 請求失敗")
            return False
    except Exception as e:
        print(f"❌ GET 請求錯誤: {e}")
        return False

def test_post_with_minimal_data():
    """測試最小資料的 POST 請求"""
    print("\n🔍 測試最小資料 POST 請求...")
    
    minimal_data = {
        "test": True,
        "message": "最小測試"
    }
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(minimal_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("✅ 最小資料 POST 成功")
                return True
            except:
                print("⚠️ 回應不是 JSON 格式")
                return False
        else:
            print("❌ 最小資料 POST 失敗")
            return False
    except Exception as e:
        print(f"❌ 最小資料 POST 錯誤: {e}")
        return False

def test_post_with_html_data():
    """測試包含 HTML 資料的 POST 請求"""
    print("\n🔍 測試 HTML 資料 POST 請求...")
    
    html_data = {
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
            data=json.dumps(html_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("✅ HTML 資料 POST 成功")
                
                # 檢查是否有新功能的回應
                if result.get('htmlSheetName') or result.get('statsSheetName'):
                    print("✅ 新功能已啟用！")
                    print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                    print(f"   統計工作表: {result.get('statsSheetName')}")
                    return True
                else:
                    print("❌ 新功能未啟用")
                    print("   回應中沒有 htmlSheetName 或 statsSheetName")
                    return False
            except:
                print("⚠️ 回應不是 JSON 格式")
                return False
        else:
            print("❌ HTML 資料 POST 失敗")
            return False
    except Exception as e:
        print(f"❌ HTML 資料 POST 錯誤: {e}")
        return False

def test_error_handling():
    """測試錯誤處理"""
    print("\n🔍 測試錯誤處理...")
    
    # 測試無效的 JSON
    try:
        response = requests.post(
            SCRIPT_URL,
            data="invalid json",
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"無效 JSON 測試:")
        print(f"   狀態碼: {response.status_code}")
        print(f"   回應內容: {response.text}")
        
    except Exception as e:
        print(f"❌ 無效 JSON 測試錯誤: {e}")

def main():
    """主診斷函數"""
    print("🚀 Google Apps Script 診斷")
    print("=" * 50)
    
    # 測試 GET 請求
    get_ok = test_get_request()
    
    # 測試最小資料 POST
    minimal_ok = test_post_with_minimal_data()
    
    # 測試 HTML 資料 POST
    html_ok = test_post_with_html_data()
    
    # 測試錯誤處理
    test_error_handling()
    
    print("\n" + "=" * 50)
    print("📋 診斷結果:")
    
    if get_ok and minimal_ok and html_ok:
        print("✅ 所有基本功能正常")
        print("✅ 新功能已啟用")
    elif get_ok and minimal_ok:
        print("✅ 基本功能正常")
        print("❌ 新功能未啟用")
        print("   請檢查 Google Apps Script 程式碼是否已更新")
    elif get_ok:
        print("⚠️ 基本連接正常，但 POST 功能有問題")
    else:
        print("❌ 基本連接有問題")
    
    print("\n🔧 建議:")
    print("1. 確認 Google Apps Script 程式碼已完全更新")
    print("2. 確認已重新部署 Google Apps Script")
    print("3. 檢查試算表 ID 和權限設定")
    print("4. 等待幾分鐘讓更新生效")

if __name__ == "__main__":
    main()

