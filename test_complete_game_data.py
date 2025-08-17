"""
測試完整的比賽資料，包含選手參與資料
"""

import json
import requests
from datetime import datetime

# Google Apps Script 部署 URL
SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBJwojHfXLvm_uMTd1aalSrKyD3pRjIJ5IJr0jpHFFNyMf8ga4mZ_74-p0RvCIYPro/exec'

def test_complete_game_data():
    """測試完整的比賽資料"""
    print("🔍 測試完整的比賽資料...")
    
    # 模擬完整的比賽資料
    test_data = {
        "gameId": "g01",
        "gameDate": "2025/8/17",
        "awayTeam": "Jack",
        "homeTeam": "逃生入口C",
        "venue": "逃生入口 Bar",
        "selectedPlayers": {
            "1": {"away": ["小建", "阿福"], "home": ["Lucas", "Eric"]},
            "2": {"away": ["B哥", "阿俊"], "home": ["傑西", "乳來"]},
            "3": {"away": ["老師", "大根毛"], "home": ["承翰", "小東"]},
            "4": {"away": ["Stan", "小魚"], "home": ["小歪", "阿誠"]},
            "5": {"away": ["小虎", "發哥"], "home": ["阿隼", "少博"]},
            "6": {"away": ["Terry", "阿元"], "home": ["阿樂", "土豆"]},
            "7": {"away": ["小胖", "祐祐"], "home": ["Lucas", "Eric"]},
            "8": {"away": ["雯雯", "小準"], "home": ["傑西", "乳來"]},
            "9": {"away": ["阿翰", "小建"], "home": ["承翰", "小東"]},
            "10": {"away": ["阿福", "B哥"], "home": ["小歪", "阿誠"]},
            "11": {"away": ["阿俊", "老師"], "home": ["阿隼", "少博"]},
            "12": {"away": ["大根毛", "Stan"], "home": ["阿樂", "土豆"]},
            "13": {"away": ["小魚", "小虎"], "home": ["Lucas", "Eric"]},
            "14": {"away": ["發哥", "Terry"], "home": ["傑西", "乳來"]},
            "15": {"away": ["小建", "阿福", "B哥", "阿俊"], "home": ["Lucas", "Eric", "傑西", "乳來"]},
            "16": {"away": ["老師", "大根毛", "Stan", "小魚"], "home": ["承翰", "小東", "小歪", "阿誠"]}
        },
        "winLoseData": {
            "1": "away", "2": "home", "3": "away", "4": "home", "5": "away", "6": "home",
            "7": "away", "8": "home", "9": "away", "10": "home", "11": "away", "12": "home",
            "13": "away", "14": "home", "15": "away", "16": "home"
        },
        "firstAttackData": {
            "1": "away", "2": "home", "3": "away", "4": "home", "5": "away", "6": "home",
            "7": "away", "8": "home", "9": "away", "10": "home", "11": "away", "12": "home",
            "13": "away", "14": "home", "15": "away", "16": "home"
        },
        "drinkingBonus": {"away": 5, "home": 0},
        "htmlContent": "<html><body><h1>測試 HTML 內容</h1><p>這是完整的比賽資料測試</p></body></html>",
        "playerStats": {
            "away": [
                {"name": "小建", "o1Games": 3, "o1Wins": 2, "crGames": 1, "crWins": 1, "totalGames": 4, "totalWins": 3, "firstAttacks": 2},
                {"name": "阿福", "o1Games": 3, "o1Wins": 2, "crGames": 1, "crWins": 1, "totalGames": 4, "totalWins": 3, "firstAttacks": 2},
                {"name": "B哥", "o1Games": 3, "o1Wins": 2, "crGames": 1, "crWins": 1, "totalGames": 4, "totalWins": 3, "firstAttacks": 2},
                {"name": "阿俊", "o1Games": 3, "o1Wins": 2, "crGames": 1, "crWins": 1, "totalGames": 4, "totalWins": 3, "firstAttacks": 2}
            ],
            "home": [
                {"name": "Lucas", "o1Games": 3, "o1Wins": 1, "crGames": 1, "crWins": 0, "totalGames": 4, "totalWins": 1, "firstAttacks": 2},
                {"name": "Eric", "o1Games": 3, "o1Wins": 1, "crGames": 1, "crWins": 0, "totalGames": 4, "totalWins": 1, "firstAttacks": 2},
                {"name": "傑西", "o1Games": 3, "o1Wins": 1, "crGames": 1, "crWins": 0, "totalGames": 4, "totalWins": 1, "firstAttacks": 2},
                {"name": "乳來", "o1Games": 3, "o1Wins": 1, "crGames": 1, "crWins": 0, "totalGames": 4, "totalWins": 1, "firstAttacks": 2}
            ]
        },
        "htmlSheetName": f"g01_{datetime.now().strftime('%Y-%m-%dT%H-%M-%S')}",
        "statsSheetName": f"result_{datetime.now().strftime('%Y-%m-%dT%H-%M-%S')}",
        "timestamp": datetime.now().isoformat()
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
                print(f"   遊戲 ID: {result.get('gameId')}")
                print(f"   HTML 工作表: {result.get('htmlSheetName')}")
                print(f"   統計工作表: {result.get('statsSheetName')}")
                
                if result.get('htmlSheetName') and result.get('statsSheetName'):
                    print("✅ 完整比賽資料測試成功！")
                    return True
                else:
                    print("❌ 工作表建立失敗")
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
    print("🚀 測試完整的比賽資料")
    print("=" * 50)
    
    success = test_complete_game_data()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ 完整比賽資料測試成功！")
        print("✅ 選手統計資料應該已正確寫入")
    else:
        print("❌ 完整比賽資料測試失敗")
        print("   請檢查 Google Apps Script 設定")

if __name__ == "__main__":
    main()
