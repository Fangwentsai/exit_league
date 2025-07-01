#!/usr/bin/env python3
"""
Season 3 統計計算器 - 從Firebase比賽資料計算選手、隊伍統計
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

class Season3StatisticsCalculator:
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
    
    def calculate_player_statistics(self, matches):
        """計算選手個人統計"""
        print("📊 計算選手個人統計...")
        
        players_stats = defaultdict(lambda: {
            'name': '',
            'teams': set(),
            'total_games': 0,
            'total_sets': 0,
            'total_wins': 0,
            'o1_sets': 0,
            'o1_wins': 0,
            'cr_sets': 0,
            'cr_wins': 0,
            'first_attacks': 0,
            'games_played': [],
            'opponents_faced': defaultdict(lambda: {'wins': 0, 'total': 0})
        })
        
        for match in matches:
            away_team = match['away_team']
            home_team = match['home_team']
            away_players = match.get('away_players', [])
            home_players = match.get('home_players', [])
            
            # 使用sets欄位（在上傳時重新命名了）
            match_sets = match.get('sets', [])
            
            # 記錄參賽選手的隊伍
            for player in away_players:
                players_stats[player]['name'] = player
                players_stats[player]['teams'].add(away_team)
                players_stats[player]['total_games'] += 1
                players_stats[player]['games_played'].append({
                    'game_number': match['game_number'],
                    'date': match['date'],
                    'opponent_team': home_team,
                    'venue': match['venue'],
                    'team_role': 'away'
                })
            
            for player in home_players:
                players_stats[player]['name'] = player
                players_stats[player]['teams'].add(home_team)
                players_stats[player]['total_games'] += 1
                players_stats[player]['games_played'].append({
                    'game_number': match['game_number'],
                    'date': match['date'],
                    'opponent_team': away_team,
                    'venue': match['venue'],
                    'team_role': 'home'
                })
            
            # 分析每一局
            for set_data in match_sets:
                set_type = set_data.get('type', '')
                away_players_in_set = set_data.get('away', [])
                home_players_in_set = set_data.get('home', [])
                first_attack = set_data.get('firstAttack', '')
                winner = set_data.get('winner', '')
                
                # 標準化選手名單（處理字串和陣列）
                if isinstance(away_players_in_set, str):
                    away_players_in_set = [away_players_in_set]
                if isinstance(home_players_in_set, str):
                    home_players_in_set = [home_players_in_set]
                
                # 統計客隊選手
                for player in away_players_in_set:
                    if player in players_stats:
                        players_stats[player]['total_sets'] += 1
                        
                        if winner == 'away':
                            players_stats[player]['total_wins'] += 1
                        
                        if set_type == '01':
                            players_stats[player]['o1_sets'] += 1
                            if winner == 'away':
                                players_stats[player]['o1_wins'] += 1
                        elif set_type == 'CR':
                            players_stats[player]['cr_sets'] += 1
                            if winner == 'away':
                                players_stats[player]['cr_wins'] += 1
                        
                        if first_attack == 'away':
                            players_stats[player]['first_attacks'] += 1
                        
                        # 對戰統計
                        for opponent in home_players_in_set:
                            players_stats[player]['opponents_faced'][opponent]['total'] += 1
                            if winner == 'away':
                                players_stats[player]['opponents_faced'][opponent]['wins'] += 1
                
                # 統計主隊選手
                for player in home_players_in_set:
                    if player in players_stats:
                        players_stats[player]['total_sets'] += 1
                        
                        if winner == 'home':
                            players_stats[player]['total_wins'] += 1
                        
                        if set_type == '01':
                            players_stats[player]['o1_sets'] += 1
                            if winner == 'home':
                                players_stats[player]['o1_wins'] += 1
                        elif set_type == 'CR':
                            players_stats[player]['cr_sets'] += 1
                            if winner == 'home':
                                players_stats[player]['cr_wins'] += 1
                        
                        if first_attack == 'home':
                            players_stats[player]['first_attacks'] += 1
                        
                        # 對戰統計
                        for opponent in away_players_in_set:
                            players_stats[player]['opponents_faced'][opponent]['total'] += 1
                            if winner == 'home':
                                players_stats[player]['opponents_faced'][opponent]['wins'] += 1
        
        # 計算勝率和整理資料
        final_players_stats = {}
        for player_name, stats in players_stats.items():
            # 計算勝率
            win_rate = (stats['total_wins'] / stats['total_sets'] * 100) if stats['total_sets'] > 0 else 0
            o1_win_rate = (stats['o1_wins'] / stats['o1_sets'] * 100) if stats['o1_sets'] > 0 else 0
            cr_win_rate = (stats['cr_wins'] / stats['cr_sets'] * 100) if stats['cr_sets'] > 0 else 0
            
            # 整理對戰統計
            opponents_stats = {}
            for opponent, opp_stats in stats['opponents_faced'].items():
                if opp_stats['total'] > 0:
                    opponents_stats[opponent] = {
                        'wins': opp_stats['wins'],
                        'total': opp_stats['total'],
                        'win_rate': round(opp_stats['wins'] / opp_stats['total'] * 100, 1)
                    }
            
            final_players_stats[player_name] = {
                'name': player_name,
                'teams': list(stats['teams']),
                'seasons': ['season3'],
                'season3': {
                    'total_games': stats['total_games'],
                    'total_sets': stats['total_sets'],
                    'total_wins': stats['total_wins'],
                    'total_losses': stats['total_sets'] - stats['total_wins'],
                    'win_rate': round(win_rate, 1),
                    'o1_sets': stats['o1_sets'],
                    'o1_wins': stats['o1_wins'],
                    'o1_win_rate': round(o1_win_rate, 1),
                    'cr_sets': stats['cr_sets'],
                    'cr_wins': stats['cr_wins'],
                    'cr_win_rate': round(cr_win_rate, 1),
                    'first_attacks': stats['first_attacks'],
                    'vs_opponents': opponents_stats
                },
                'career_total': {
                    'total_games': stats['total_games'],
                    'total_sets': stats['total_sets'],
                    'total_wins': stats['total_wins'],
                    'win_rate': round(win_rate, 1)
                },
                'last_updated': firestore.SERVER_TIMESTAMP
            }
        
        print(f"✅ 選手統計計算完成: {len(final_players_stats)} 位選手")
        return final_players_stats
    
    def calculate_team_statistics(self, matches):
        """計算隊伍戰績"""
        print("📊 計算隊伍戰績...")
        
        teams_stats = defaultdict(lambda: {
            'name': '',
            'total_games': 0,
            'wins': 0,
            'losses': 0,
            'total_sets': 0,
            'sets_won': 0,
            'sets_lost': 0,
            'home_games': 0,
            'home_wins': 0,
            'away_games': 0,
            'away_wins': 0,
            'vs_teams': defaultdict(lambda: {
                'games': 0, 'wins': 0, 'sets_won': 0, 'sets_lost': 0
            }),
            'players_used': set(),
            'games_played': []
        })
        
        for match in matches:
            away_team = match['away_team']
            home_team = match['home_team']
            away_players = match.get('away_players', [])
            home_players = match.get('home_players', [])
            
            # 使用sets欄位計算實際得分（在上傳時重新命名了）
            match_sets = match.get('sets', [])
            away_sets_won = 0
            home_sets_won = 0
            total_sets = len(match_sets)
            
            # 計算每隊贏得的局數
            for set_data in match_sets:
                winner = set_data.get('winner', '')
                if winner == 'away':
                    away_sets_won += 1
                elif winner == 'home':
                    home_sets_won += 1
            
            # 判定比賽勝負（贏得較多局數的隊伍獲勝）
            away_wins_match = away_sets_won > home_sets_won
            home_wins_match = home_sets_won > away_sets_won
            
            # 客隊統計
            teams_stats[away_team]['name'] = away_team
            teams_stats[away_team]['total_games'] += 1
            teams_stats[away_team]['away_games'] += 1
            teams_stats[away_team]['total_sets'] += total_sets
            teams_stats[away_team]['sets_won'] += away_sets_won
            teams_stats[away_team]['sets_lost'] += home_sets_won
            teams_stats[away_team]['players_used'].update(away_players)
            
            if away_wins_match:
                teams_stats[away_team]['wins'] += 1
                teams_stats[away_team]['away_wins'] += 1
            else:
                teams_stats[away_team]['losses'] += 1
            
            # 對戰統計
            teams_stats[away_team]['vs_teams'][home_team]['games'] += 1
            teams_stats[away_team]['vs_teams'][home_team]['sets_won'] += away_sets_won
            teams_stats[away_team]['vs_teams'][home_team]['sets_lost'] += home_sets_won
            if away_wins_match:
                teams_stats[away_team]['vs_teams'][home_team]['wins'] += 1
            
            teams_stats[away_team]['games_played'].append({
                'game_number': match['game_number'],
                'date': match['date'],
                'opponent': home_team,
                'venue': match['venue'],
                'role': 'away',
                'result': 'win' if away_wins_match else 'loss',
                'score': f"{away_sets_won}-{home_sets_won}",
                'sets_breakdown': f"贏{away_sets_won}局，輸{home_sets_won}局"
            })
            
            # 主隊統計
            teams_stats[home_team]['name'] = home_team
            teams_stats[home_team]['total_games'] += 1
            teams_stats[home_team]['home_games'] += 1
            teams_stats[home_team]['total_sets'] += total_sets
            teams_stats[home_team]['sets_won'] += home_sets_won
            teams_stats[home_team]['sets_lost'] += away_sets_won
            teams_stats[home_team]['players_used'].update(home_players)
            
            if home_wins_match:
                teams_stats[home_team]['wins'] += 1
                teams_stats[home_team]['home_wins'] += 1
            else:
                teams_stats[home_team]['losses'] += 1
            
            # 對戰統計
            teams_stats[home_team]['vs_teams'][away_team]['games'] += 1
            teams_stats[home_team]['vs_teams'][away_team]['sets_won'] += home_sets_won
            teams_stats[home_team]['vs_teams'][away_team]['sets_lost'] += away_sets_won
            if home_wins_match:
                teams_stats[home_team]['vs_teams'][away_team]['wins'] += 1
            
            teams_stats[home_team]['games_played'].append({
                'game_number': match['game_number'],
                'date': match['date'],
                'opponent': away_team,
                'venue': match['venue'],
                'role': 'home',
                'result': 'win' if home_wins_match else 'loss',
                'score': f"{home_sets_won}-{away_sets_won}",
                'sets_breakdown': f"贏{home_sets_won}局，輸{away_sets_won}局"
            })
        
        # 計算勝率和整理資料
        final_teams_stats = {}
        for team_name, stats in teams_stats.items():
            win_rate = (stats['wins'] / stats['total_games'] * 100) if stats['total_games'] > 0 else 0
            set_win_rate = (stats['sets_won'] / stats['total_sets'] * 100) if stats['total_sets'] > 0 else 0
            home_win_rate = (stats['home_wins'] / stats['home_games'] * 100) if stats['home_games'] > 0 else 0
            away_win_rate = (stats['away_wins'] / stats['away_games'] * 100) if stats['away_games'] > 0 else 0
            
            # 整理對戰統計
            vs_teams_stats = {}
            for opponent, opp_stats in stats['vs_teams'].items():
                vs_teams_stats[opponent] = {
                    'games': opp_stats['games'],
                    'wins': opp_stats['wins'],
                    'losses': opp_stats['games'] - opp_stats['wins'],
                    'win_rate': round(opp_stats['wins'] / opp_stats['games'] * 100, 1) if opp_stats['games'] > 0 else 0,
                    'sets_won': opp_stats['sets_won'],
                    'sets_lost': opp_stats['sets_lost'],
                    'set_win_rate': round(opp_stats['sets_won'] / (opp_stats['sets_won'] + opp_stats['sets_lost']) * 100, 1) if (opp_stats['sets_won'] + opp_stats['sets_lost']) > 0 else 0
                }
            
            final_teams_stats[team_name] = {
                'name': team_name,
                'seasons': ['season3'],
                'season3': {
                    'total_games': stats['total_games'],
                    'wins': stats['wins'],
                    'losses': stats['losses'],
                    'win_rate': round(win_rate, 1),
                    'total_sets': stats['total_sets'],
                    'sets_won': stats['sets_won'],
                    'sets_lost': stats['sets_lost'],
                    'set_win_rate': round(set_win_rate, 1),
                    'home_record': {
                        'games': stats['home_games'],
                        'wins': stats['home_wins'],
                        'losses': stats['home_games'] - stats['home_wins'],
                        'win_rate': round(home_win_rate, 1)
                    },
                    'away_record': {
                        'games': stats['away_games'],
                        'wins': stats['away_wins'],
                        'losses': stats['away_games'] - stats['away_wins'],
                        'win_rate': round(away_win_rate, 1)
                    },
                    'vs_teams': vs_teams_stats,
                    'players_used': sorted(list(stats['players_used']))
                },
                'career_total': {
                    'total_games': stats['total_games'],
                    'wins': stats['wins'],
                    'win_rate': round(win_rate, 1)
                },
                'last_updated': firestore.SERVER_TIMESTAMP
            }
        
        print(f"✅ 隊伍統計計算完成: {len(final_teams_stats)} 支隊伍")
        return final_teams_stats
    
    def generate_season3_rankings(self, players_stats, teams_stats):
        """生成Season 3排行榜"""
        print("📊 生成Season 3排行榜...")
        
        # 選手排行榜
        players_list = list(players_stats.values())
        
        # 依不同標準排序
        top_players_by_wins = sorted(
            players_list, 
            key=lambda x: x['season3']['total_wins'], 
            reverse=True
        )[:20]
        
        top_players_by_win_rate = sorted(
            [p for p in players_list if p['season3']['total_sets'] >= 20],  # 至少20局
            key=lambda x: x['season3']['win_rate'], 
            reverse=True
        )[:20]
        
        top_players_by_games = sorted(
            players_list,
            key=lambda x: x['season3']['total_games'],
            reverse=True
        )[:20]
        
        # 隊伍排行榜
        teams_list = list(teams_stats.values())
        
        team_standings = sorted(
            teams_list,
            key=lambda x: (x['season3']['wins'], x['season3']['win_rate']),
            reverse=True
        )
        
        rankings = {
            'season': 'season3',
            'generated_at': firestore.SERVER_TIMESTAMP,
            'player_rankings': {
                'most_wins': [
                    {
                        'rank': i+1,
                        'name': p['name'],
                        'teams': p['teams'],
                        'total_wins': p['season3']['total_wins'],
                        'total_sets': p['season3']['total_sets'],
                        'win_rate': p['season3']['win_rate']
                    } for i, p in enumerate(top_players_by_wins)
                ],
                'highest_win_rate': [
                    {
                        'rank': i+1,
                        'name': p['name'],
                        'teams': p['teams'],
                        'win_rate': p['season3']['win_rate'],
                        'total_wins': p['season3']['total_wins'],
                        'total_sets': p['season3']['total_sets']
                    } for i, p in enumerate(top_players_by_win_rate)
                ],
                'most_active': [
                    {
                        'rank': i+1,
                        'name': p['name'],
                        'teams': p['teams'],
                        'total_games': p['season3']['total_games'],
                        'total_sets': p['season3']['total_sets'],
                        'win_rate': p['season3']['win_rate']
                    } for i, p in enumerate(top_players_by_games)
                ]
            },
            'team_standings': [
                {
                    'rank': i+1,
                    'name': t['name'],
                    'wins': t['season3']['wins'],
                    'losses': t['season3']['losses'],
                    'win_rate': t['season3']['win_rate'],
                    'sets_won': t['season3']['sets_won'],
                    'sets_lost': t['season3']['sets_lost'],
                    'set_win_rate': t['season3']['set_win_rate']
                } for i, t in enumerate(team_standings)
            ]
        }
        
        print("✅ 排行榜生成完成")
        return rankings
    
    def upload_statistics_to_firebase(self, players_stats, teams_stats, rankings):
        """上傳統計資料到Firebase"""
        print("📤 上傳統計資料到Firebase...")
        
        try:
            # 上傳選手統計到 players/season3/
            print("  上傳選手統計到 players/season3/...")
            batch = self.db.batch()
            batch_count = 0
            
            for player_name, stats in players_stats.items():
                doc_ref = self.db.collection('players').document('season3').collection('players').document(player_name)
                batch.set(doc_ref, stats)
                batch_count += 1
                
                if batch_count >= 500:
                    batch.commit()
                    print(f"    已上傳 {batch_count} 位選手...")
                    batch = self.db.batch()
                    batch_count = 0
            
            if batch_count > 0:
                batch.commit()
            
            print(f"✅ 選手統計上傳完成: {len(players_stats)} 位選手")
            
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
    
    def calculate_and_upload_all(self):
        """執行完整的統計計算和上傳流程"""
        print("🎯 Season 3 統計計算器")
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
            players_stats = self.calculate_player_statistics(matches)
            teams_stats = self.calculate_team_statistics(matches)
            rankings = self.generate_season3_rankings(players_stats, teams_stats)
            
            # 顯示摘要
            print(f"\n📋 統計摘要:")
            print(f"   選手數量: {len(players_stats)} 位")
            print(f"   隊伍數量: {len(teams_stats)} 支")
            print(f"   排行榜項目: {len(rankings['player_rankings'])} 個分類")
            
            # 詢問是否上傳
            response = input(f"\n❓ 確認要上傳這些統計資料到Firebase嗎？ (yes/Enter): ").strip().lower()
            if response != 'yes':
                print("❌ 上傳已取消")
                return False
            
            # 上傳統計
            success = self.upload_statistics_to_firebase(players_stats, teams_stats, rankings)
            
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
    print("🎯 Season 3 統計計算器")
    print("=" * 50)
    
    # 檢查是否提供服務帳戶金鑰路徑
    if len(sys.argv) < 2:
        print("❌ 請提供Firebase服務帳戶金鑰檔案路徑")
        print("使用方式: python3 calculate_season3_statistics.py <金鑰檔案路徑>")
        return
    
    service_account_path = sys.argv[1]
    if not Path(service_account_path).exists():
        print(f"❌ 服務帳戶金鑰檔案不存在: {service_account_path}")
        return
    
    print(f"🔑 使用金鑰檔案: {service_account_path}")
    
    # 建立統計計算器
    calculator = Season3StatisticsCalculator(service_account_path)
    
    # 執行統計計算
    success = calculator.calculate_and_upload_all()
    
    if success:
        print("\n✅ 統計計算完成！")
        print("\n📋 已建立的資料結構:")
        print("- players/season3/players/ (Season 3選手個人統計)")
        print("- teams/season3/teams/ (Season 3隊伍戰績)")
        print("- statistics/season3 (Season 3季節排行榜)")
    else:
        print("\n❌ 統計計算失敗")
        sys.exit(1)

if __name__ == '__main__':
    main()