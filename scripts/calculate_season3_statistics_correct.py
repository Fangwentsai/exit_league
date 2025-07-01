#!/usr/bin/env python3
"""
Season 3 統計計算器 - 使用正確的計分邏輯
計分規則：
1. 統計每個SET的得分（單人1分、雙人2分、三人3分、四人4分）
2. SET得分數較高的額外+1(勝場加成+1, 若平手則雙方均不加)
3. 額外有一個「飲酒加成」的+5分機制
4. 得到總分（SET得分 + 勝場加成 + 飲酒加成）
5. 勝負判定：總分較高者獲勝，平手則為和局
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

class Season3StatisticsCalculatorCorrect:
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
    
    def calculate_match_scores(self, match):
        """計算單場比賽的詳細得分"""
        sets = match.get('sets', [])
        drinking_bonus = match.get('drinking_bonus', {'away': 0, 'home': 0})
        
        away_set_score = 0
        home_set_score = 0
        away_sets_won = 0
        home_sets_won = 0
        
        # 計算每個SET的得分
        for set_data in sets:
            away_players = set_data.get('away', [])
            home_players = set_data.get('home', [])
            winner = set_data.get('winner', '')
            
            # 計算SET得分
            away_score = self.calculate_set_score(away_players)
            home_score = self.calculate_set_score(home_players)
            
            away_set_score += away_score
            home_set_score += home_score
            
            # 統計勝局數
            if winner == 'away':
                away_sets_won += 1
            elif winner == 'home':
                home_sets_won += 1
        
        # 勝場加成：SET得分較高的+1
        away_win_bonus = 0
        home_win_bonus = 0
        if away_set_score > home_set_score:
            away_win_bonus = 1
        elif home_set_score > away_set_score:
            home_win_bonus = 1
        # 平手則雙方均不加
        
        # 飲酒加成
        away_drinking_bonus = drinking_bonus.get('away', 0)
        home_drinking_bonus = drinking_bonus.get('home', 0)
        
        # 計算總分
        away_total_score = away_set_score + away_win_bonus + away_drinking_bonus
        home_total_score = home_set_score + home_win_bonus + home_drinking_bonus
        
        # 判定比賽結果
        if away_total_score > home_total_score:
            match_result = 'away_win'
        elif home_total_score > away_total_score:
            match_result = 'home_win'
        else:
            match_result = 'tie'
        
        return {
            'away_set_score': away_set_score,
            'home_set_score': home_set_score,
            'away_win_bonus': away_win_bonus,
            'home_win_bonus': home_win_bonus,
            'away_drinking_bonus': away_drinking_bonus,
            'home_drinking_bonus': home_drinking_bonus,
            'away_total_score': away_total_score,
            'home_total_score': home_total_score,
            'away_sets_won': away_sets_won,
            'home_sets_won': home_sets_won,
            'total_sets': len(sets),
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
            'total_points': 0,
            'drinking_bonus_total': 0,
            'set_points': 0,
            'win_bonus': 0,
            'home_games': 0,
            'home_wins': 0,
            'home_ties': 0,
            'away_games': 0,
            'away_wins': 0,
            'away_ties': 0,
            'vs_teams': defaultdict(lambda: {
                'games': 0, 'wins': 0, 'losses': 0, 'ties': 0,
                'points_for': 0, 'points_against': 0
            }),
            'players_used': set(),
            'games_played': []
        })
        
        for match in matches:
            away_team = match['away_team']
            home_team = match['home_team']
            away_players = match.get('away_players', [])
            home_players = match.get('home_players', [])
            
            # 計算比賽得分
            scores = self.calculate_match_scores(match)
            
            # 客隊統計
            teams_stats[away_team]['name'] = away_team
            teams_stats[away_team]['total_games'] += 1
            teams_stats[away_team]['away_games'] += 1
            teams_stats[away_team]['total_points'] += scores['away_total_score']
            teams_stats[away_team]['set_points'] += scores['away_set_score']
            teams_stats[away_team]['win_bonus'] += scores['away_win_bonus']
            teams_stats[away_team]['drinking_bonus_total'] += scores['away_drinking_bonus']
            teams_stats[away_team]['players_used'].update(away_players)
            
            if scores['match_result'] == 'away_win':
                teams_stats[away_team]['wins'] += 1
                teams_stats[away_team]['away_wins'] += 1
            elif scores['match_result'] == 'home_win':
                teams_stats[away_team]['losses'] += 1
            else:  # tie
                teams_stats[away_team]['ties'] += 1
                teams_stats[away_team]['away_ties'] += 1
            
            # 對戰統計
            teams_stats[away_team]['vs_teams'][home_team]['games'] += 1
            teams_stats[away_team]['vs_teams'][home_team]['points_for'] += scores['away_total_score']
            teams_stats[away_team]['vs_teams'][home_team]['points_against'] += scores['home_total_score']
            if scores['match_result'] == 'away_win':
                teams_stats[away_team]['vs_teams'][home_team]['wins'] += 1
            elif scores['match_result'] == 'home_win':
                teams_stats[away_team]['vs_teams'][home_team]['losses'] += 1
            else:
                teams_stats[away_team]['vs_teams'][home_team]['ties'] += 1
            
            teams_stats[away_team]['games_played'].append({
                'game_number': match['game_number'],
                'date': match['date'],
                'opponent': home_team,
                'venue': match['venue'],
                'role': 'away',
                'result': scores['match_result'].replace('away_', '').replace('home_', 'loss' if 'home_' in scores['match_result'] else ''),
                'score': f"{scores['away_total_score']}-{scores['home_total_score']}",
                'breakdown': {
                    'set_score': scores['away_set_score'],
                    'win_bonus': scores['away_win_bonus'],
                    'drinking_bonus': scores['away_drinking_bonus'],
                    'total': scores['away_total_score']
                }
            })
            
            # 主隊統計
            teams_stats[home_team]['name'] = home_team
            teams_stats[home_team]['total_games'] += 1
            teams_stats[home_team]['home_games'] += 1
            teams_stats[home_team]['total_points'] += scores['home_total_score']
            teams_stats[home_team]['set_points'] += scores['home_set_score']
            teams_stats[home_team]['win_bonus'] += scores['home_win_bonus']
            teams_stats[home_team]['drinking_bonus_total'] += scores['home_drinking_bonus']
            teams_stats[home_team]['players_used'].update(home_players)
            
            if scores['match_result'] == 'home_win':
                teams_stats[home_team]['wins'] += 1
                teams_stats[home_team]['home_wins'] += 1
            elif scores['match_result'] == 'away_win':
                teams_stats[home_team]['losses'] += 1
            else:  # tie
                teams_stats[home_team]['ties'] += 1
                teams_stats[home_team]['home_ties'] += 1
            
            # 對戰統計
            teams_stats[home_team]['vs_teams'][away_team]['games'] += 1
            teams_stats[home_team]['vs_teams'][away_team]['points_for'] += scores['home_total_score']
            teams_stats[home_team]['vs_teams'][away_team]['points_against'] += scores['away_total_score']
            if scores['match_result'] == 'home_win':
                teams_stats[home_team]['vs_teams'][away_team]['wins'] += 1
            elif scores['match_result'] == 'away_win':
                teams_stats[home_team]['vs_teams'][away_team]['losses'] += 1
            else:
                teams_stats[home_team]['vs_teams'][away_team]['ties'] += 1
            
            teams_stats[home_team]['games_played'].append({
                'game_number': match['game_number'],
                'date': match['date'],
                'opponent': away_team,
                'venue': match['venue'],
                'role': 'home',
                'result': scores['match_result'].replace('home_', '').replace('away_', 'loss' if 'away_' in scores['match_result'] else ''),
                'score': f"{scores['home_total_score']}-{scores['away_total_score']}",
                'breakdown': {
                    'set_score': scores['home_set_score'],
                    'win_bonus': scores['home_win_bonus'],
                    'drinking_bonus': scores['home_drinking_bonus'],
                    'total': scores['home_total_score']
                }
            })
        
        # 計算勝率和整理資料
        final_teams_stats = {}
        for team_name, stats in teams_stats.items():
            total_games = stats['total_games']
            win_rate = (stats['wins'] / total_games * 100) if total_games > 0 else 0
            home_win_rate = (stats['home_wins'] / stats['home_games'] * 100) if stats['home_games'] > 0 else 0
            away_win_rate = (stats['away_wins'] / stats['away_games'] * 100) if stats['away_games'] > 0 else 0
            
            # 整理對戰統計
            vs_teams_stats = {}
            for opponent, opp_stats in stats['vs_teams'].items():
                vs_teams_stats[opponent] = {
                    'games': opp_stats['games'],
                    'wins': opp_stats['wins'],
                    'losses': opp_stats['losses'],
                    'ties': opp_stats['ties'],
                    'win_rate': round(opp_stats['wins'] / opp_stats['games'] * 100, 1) if opp_stats['games'] > 0 else 0,
                    'points_for': opp_stats['points_for'],
                    'points_against': opp_stats['points_against'],
                    'point_diff': opp_stats['points_for'] - opp_stats['points_against']
                }
            
            final_teams_stats[team_name] = {
                'name': team_name,
                'seasons': ['season3'],
                'season3': {
                    'total_games': total_games,
                    'wins': stats['wins'],
                    'losses': stats['losses'],
                    'ties': stats['ties'],
                    'win_rate': round(win_rate, 1),
                    'total_points': stats['total_points'],
                    'set_points': stats['set_points'],
                    'win_bonus': stats['win_bonus'],
                    'drinking_bonus_total': stats['drinking_bonus_total'],
                    'avg_points_per_game': round(stats['total_points'] / total_games, 1) if total_games > 0 else 0,
                    'home_record': {
                        'games': stats['home_games'],
                        'wins': stats['home_wins'],
                        'losses': stats['home_games'] - stats['home_wins'] - stats['home_ties'],
                        'ties': stats['home_ties'],
                        'win_rate': round(home_win_rate, 1)
                    },
                    'away_record': {
                        'games': stats['away_games'],
                        'wins': stats['away_wins'],
                        'losses': stats['away_games'] - stats['away_wins'] - stats['away_ties'],
                        'ties': stats['away_ties'],
                        'win_rate': round(away_win_rate, 1)
                    },
                    'vs_teams': vs_teams_stats,
                    'players_used': sorted(list(stats['players_used']))
                },
                'career_total': {
                    'total_games': total_games,
                    'wins': stats['wins'],
                    'total_points': stats['total_points'],
                    'win_rate': round(win_rate, 1)
                },
                'last_updated': firestore.SERVER_TIMESTAMP
            }
        
        print(f"✅ 隊伍統計計算完成: {len(final_teams_stats)} 支隊伍")
        return final_teams_stats
    
    def generate_season3_rankings(self, teams_stats):
        """生成Season 3排行榜"""
        print("📊 生成Season 3排行榜...")
        
        teams_list = list(teams_stats.values())
        
        # 依不同標準排序
        # 1. 按勝場數排序
        by_wins = sorted(
            teams_list,
            key=lambda x: (x['season3']['wins'], x['season3']['total_points']),
            reverse=True
        )
        
        # 2. 按總積分排序
        by_points = sorted(
            teams_list,
            key=lambda x: x['season3']['total_points'],
            reverse=True
        )
        
        # 3. 按勝率排序
        by_win_rate = sorted(
            teams_list,
            key=lambda x: (x['season3']['win_rate'], x['season3']['wins']),
            reverse=True
        )
        
        rankings = {
            'season': 'season3',
            'generated_at': firestore.SERVER_TIMESTAMP,
            'team_standings': {
                'by_wins': [
                    {
                        'rank': i+1,
                        'name': t['name'],
                        'wins': t['season3']['wins'],
                        'losses': t['season3']['losses'],
                        'ties': t['season3']['ties'],
                        'total_points': t['season3']['total_points'],
                        'win_rate': t['season3']['win_rate']
                    } for i, t in enumerate(by_wins)
                ],
                'by_points': [
                    {
                        'rank': i+1,
                        'name': t['name'],
                        'total_points': t['season3']['total_points'],
                        'wins': t['season3']['wins'],
                        'losses': t['season3']['losses'],
                        'ties': t['season3']['ties'],
                        'set_points': t['season3']['set_points'],
                        'win_bonus': t['season3']['win_bonus'],
                        'drinking_bonus': t['season3']['drinking_bonus_total']
                    } for i, t in enumerate(by_points)
                ],
                'by_win_rate': [
                    {
                        'rank': i+1,
                        'name': t['name'],
                        'win_rate': t['season3']['win_rate'],
                        'wins': t['season3']['wins'],
                        'losses': t['season3']['losses'],
                        'ties': t['season3']['ties'],
                        'total_points': t['season3']['total_points']
                    } for i, t in enumerate(by_win_rate)
                ]
            }
        }
        
        print("✅ 排行榜生成完成")
        return rankings
    
    def upload_statistics_to_firebase(self, teams_stats, rankings):
        """上傳統計資料到Firebase"""
        print("📤 上傳統計資料到Firebase...")
        
        try:
            # 上傳隊伍統計到 teams/season3/
            print("  上傳隊伍統計到 teams/season3/...")
            for team_name, stats in teams_stats.items():
                doc_ref = self.db.collection('teams').document('season3').collection('teams').document(team_name)
                doc_ref.set(stats)
            
            print(f"✅ 隊伍統計上傳完成: {len(teams_stats)} 支隊伍")
            
            # 上傳排行榜到 statistics/season3
            print("  上傳排行榜到 statistics/season3...")
            rankings_ref = self.db.collection('statistics').document('season3')
            rankings_ref.set(rankings)
            
            print("✅ 排行榜上傳完成")
            
            return True
            
        except Exception as e:
            print(f"❌ 上傳統計資料失敗: {e}")
            return False
    
    def show_team_summary(self, teams_stats):
        """顯示隊伍統計摘要"""
        print("\n📊 隊伍戰績摘要:")
        print("=" * 80)
        
        # 按總積分排序
        sorted_teams = sorted(
            teams_stats.items(),
            key=lambda x: x[1]['season3']['total_points'],
            reverse=True
        )
        
        print(f"{'排名':<4} {'隊伍':<12} {'勝':<3} {'敗':<3} {'和':<3} {'積分':<4} {'SET分':<5} {'勝場加成':<6} {'飲酒加成':<6} {'勝率':<6}")
        print("-" * 80)
        
        for i, (team_name, stats) in enumerate(sorted_teams):
            s3 = stats['season3']
            print(f"{i+1:<4} {team_name:<12} {s3['wins']:<3} {s3['losses']:<3} {s3['ties']:<3} "
                  f"{s3['total_points']:<4} {s3['set_points']:<5} {s3['win_bonus']:<6} "
                  f"{s3['drinking_bonus_total']:<6} {s3['win_rate']:<6.1f}%")
    
    def calculate_and_upload_all(self):
        """執行完整的統計計算和上傳流程"""
        print("🎯 Season 3 統計計算器 (正確計分版本)")
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
            rankings = self.generate_season3_rankings(teams_stats)
            
            # 顯示摘要
            self.show_team_summary(teams_stats)
            
            # 詢問是否上傳
            response = input(f"\n❓ 確認要上傳這些統計資料到Firebase嗎？ (yes/Enter): ").strip().lower()
            if response != 'yes':
                print("❌ 上傳已取消")
                return False
            
            # 上傳統計
            success = self.upload_statistics_to_firebase(teams_stats, rankings)
            
            if success:
                print(f"\n🎉 Season 3統計計算完成！")
                print(f"📊 統計資料已上傳到Firebase")
                print(f"🔗 請到Firebase Console查看資料")
                return True
            else:
                return False
                
        except Exception as e:
            print(f"❌ 統計計算過程中發生錯誤: {e}")
            return False

def main():
    print("🎯 Season 3 統計計算器 (正確計分版本)")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 calculate_season3_statistics_correct.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    print(f"🔑 使用金鑰檔案: {service_account_path}")
    
    # 建立統計計算器
    calculator = Season3StatisticsCalculatorCorrect(service_account_path)
    
    # 執行統計計算
    success = calculator.calculate_and_upload_all()
    
    if success:
        print("\n✅ 統計計算完成！")
        print("\n📋 已建立的資料結構:")
        print("- teams/season3/teams/ (Season 3隊伍戰績)")
        print("- statistics/season3 (Season 3季節排行榜)")
    else:
        print("\n❌ 統計計算失敗")
        sys.exit(1)

if __name__ == '__main__':
    main()