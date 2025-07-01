#!/usr/bin/env python3
"""
Season 3 統計計算器 - 最終正確版本
計分規則：
1. 勝負判定：比較每場比賽的SET總得分
   - 勝：SET總得分 > 對方 → 勝+1，勝場加成+1分
   - 敗：SET總得分 < 對方 → 敗+1
   - 和：SET總得分 = 對方 → 和+1
2. 積分：14場比賽所有SET分數的總和
3. 飲酒加成：獲得飲酒加成+5分，平手時雙方各+2分
4. 總分：勝場數（勝場加成）+ 積分 + 飲酒加成
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ Firebase Admin SDK未安裝")
    print("請執行: pip install firebase-admin")
    sys.exit(1)

class Season3FinalCalculator:
    def __init__(self, service_account_path):
        self.service_account_path = service_account_path
        self.db = None
        
    def initialize_firebase(self):
        """初始化Firebase連接"""
        try:
            if self.service_account_path:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
            
            self.db = firestore.client()
            print("✅ Firebase連接成功")
            return True
            
        except Exception as e:
            print(f"❌ Firebase初始化失敗: {e}")
            return False
    
    def fetch_season3_matches(self):
        """從Firebase取得Season 3所有比賽資料"""
        try:
            print("📥 從Firebase載入Season 3比賽資料...")
            
            games_ref = self.db.collection('matches').document('season3').collection('games')
            games = games_ref.order_by('game_number').stream()
            
            matches = []
            for game in games:
                match_data = game.to_dict()
                match_data['id'] = game.id
                matches.append(match_data)
            
            print(f"✅ 載入完成: {len(matches)} 場比賽")
            return matches
            
        except Exception as e:
            print(f"❌ 載入比賽資料失敗: {e}")
            return None
    
    def calculate_set_score(self, players):
        """計算SET得分（根據參賽人數）"""
        if isinstance(players, str):
            return 1  # 單人1分
        elif isinstance(players, list):
            return len(players)  # 雙人2分、三人3分、四人4分
        else:
            return 0
    
    def calculate_match_result(self, match):
        """計算單場比賽結果"""
        sets = match.get('sets', [])
        drinking_bonus = match.get('drinking_bonus', {'away': 0, 'home': 0})
        
        away_set_total = 0
        home_set_total = 0
        
        # 計算每隊的SET總得分（積分）
        for set_data in sets:
            away_players = set_data.get('away', [])
            home_players = set_data.get('home', [])
            winner = set_data.get('winner', '')
            
            # 只有獲勝的一方才能獲得分數（根據參賽人數）
            if winner == 'away':
                away_set_total += self.calculate_set_score(away_players)
            elif winner == 'home':
                home_set_total += self.calculate_set_score(home_players)
        
        # 判定勝負（只看SET得分，決定勝場加成）
        if away_set_total > home_set_total:
            match_result = 'away_win'
        elif home_set_total > away_set_total:
            match_result = 'home_win'
        else:
            match_result = 'tie'  # SET得分平手就是和局
        
        # 處理飲酒加成（與勝負無關，獨立計算）
        away_drinking_bonus = drinking_bonus.get('away', 0)
        home_drinking_bonus = drinking_bonus.get('home', 0)
        
        return {
            'away_set_total': away_set_total,
            'home_set_total': home_set_total,
            'away_drinking_bonus': away_drinking_bonus,
            'home_drinking_bonus': home_drinking_bonus,
            'match_result': match_result
        }
    
    def calculate_team_statistics(self, matches):
        """計算隊伍戰績"""
        print("📊 計算隊伍戰績...")
        
        teams_stats = defaultdict(lambda: {
            'name': '',
            'total_games': 0,
            'wins': 0,
            'losses': 0,
            'ties': 0,
            'total_set_points': 0,  # 積分（SET分數總和）
            'win_bonus': 0,         # 勝場加成
            'drinking_bonus_total': 0,  # 飲酒加成總計
            'final_total': 0,       # 總分
            'games_played': []
        })
        
        for match in matches:
            away_team = match['away_team']
            home_team = match['home_team']
            
            # 計算比賽結果
            result = self.calculate_match_result(match)
            
            # 客隊統計
            teams_stats[away_team]['name'] = away_team
            teams_stats[away_team]['total_games'] += 1
            teams_stats[away_team]['total_set_points'] += result['away_set_total']
            teams_stats[away_team]['drinking_bonus_total'] += result['away_drinking_bonus']
            
            if result['match_result'] == 'away_win':
                teams_stats[away_team]['wins'] += 1
                teams_stats[away_team]['win_bonus'] += 1  # 勝場加成+1
            elif result['match_result'] == 'home_win':
                teams_stats[away_team]['losses'] += 1
            else:  # tie
                teams_stats[away_team]['ties'] += 1
            
            teams_stats[away_team]['games_played'].append({
                'game_number': match['game_number'],
                'opponent': home_team,
                'role': 'away',
                'result': result['match_result'],
                'set_points': result['away_set_total'],
                'drinking_bonus': result['away_drinking_bonus']
            })
            
            # 主隊統計
            teams_stats[home_team]['name'] = home_team
            teams_stats[home_team]['total_games'] += 1
            teams_stats[home_team]['total_set_points'] += result['home_set_total']
            teams_stats[home_team]['drinking_bonus_total'] += result['home_drinking_bonus']
            
            if result['match_result'] == 'home_win':
                teams_stats[home_team]['wins'] += 1
                teams_stats[home_team]['win_bonus'] += 1  # 勝場加成+1
            elif result['match_result'] == 'away_win':
                teams_stats[home_team]['losses'] += 1
            else:  # tie
                teams_stats[home_team]['ties'] += 1
            
            teams_stats[home_team]['games_played'].append({
                'game_number': match['game_number'],
                'opponent': away_team,
                'role': 'home',
                'result': result['match_result'],
                'set_points': result['home_set_total'],
                'drinking_bonus': result['home_drinking_bonus']
            })
        
        # 計算最終總分
        for team_name, stats in teams_stats.items():
            # 總分 = 勝場加成 + 積分 + 飲酒加成
            stats['final_total'] = stats['win_bonus'] + stats['total_set_points'] + stats['drinking_bonus_total']
        
        print(f"✅ 隊伍統計計算完成: {len(teams_stats)} 支隊伍")
        return teams_stats
    
    def show_team_summary(self, teams_stats):
        """顯示隊伍統計摘要"""
        print("\n📊 Season 3 隊伍戰績總表:")
        print("=" * 85)
        
        # 按總分排序
        sorted_teams = sorted(
            teams_stats.items(),
            key=lambda x: x[1]['final_total'],
            reverse=True
        )
        
        print(f"{'排名':<4} {'隊伍':<12} {'勝':<3} {'敗':<3} {'和':<3} {'積分':<4} {'飲酒加成':<6} {'總分':<4}")
        print("-" * 85)
        
        for i, (team_name, stats) in enumerate(sorted_teams):
            print(f"{i+1:<4} {team_name:<12} {stats['wins']:<3} {stats['losses']:<3} {stats['ties']:<3} "
                  f"{stats['total_set_points']:<4} {stats['drinking_bonus_total']:<6} {stats['final_total']:<4}")
        
        print("\n📋 詳細驗證:")
        for i, (team_name, stats) in enumerate(sorted_teams):
            win_bonus = stats['win_bonus']
            set_points = stats['total_set_points']
            drinking_bonus = stats['drinking_bonus_total']
            final_total = stats['final_total']
            
            print(f"  {team_name}: {win_bonus}(勝場加成) + {set_points}(積分) + {drinking_bonus}(飲酒) = {final_total}")
    
    def calculate_and_show_results(self):
        """執行完整的統計計算並顯示結果"""
        print("🎯 Season 3 最終統計計算器")
        print("=" * 60)
        
        # 初始化Firebase
        if not self.initialize_firebase():
            return False
        
        # 載入比賽資料
        matches = self.fetch_season3_matches()
        if not matches:
            return False
        
        try:
            # 計算統計
            teams_stats = self.calculate_team_statistics(matches)
            
            # 顯示結果
            self.show_team_summary(teams_stats)
            
            return True
                
        except Exception as e:
            print(f"❌ 統計計算過程中發生錯誤: {e}")
            return False

def main():
    print("🎯 Season 3 最終統計計算器")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 calculate_season3_final_correct.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    print(f"🔑 使用金鑰檔案: {service_account_path}")
    
    # 建立統計計算器
    calculator = Season3FinalCalculator(service_account_path)
    
    # 執行統計計算
    success = calculator.calculate_and_show_results()
    
    if success:
        print("\n✅ 統計計算完成！")
    else:
        print("\n❌ 統計計算失敗")
        sys.exit(1)

if __name__ == '__main__':
    main() 