#!/usr/bin/env python3
"""
資料分析腳本 - 分析解析後的比賽資料並生成統計報告
"""

import json
import sys
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

class DataAnalyzer:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.data_path = self.base_path / "firebase_data"
        self.matches = []
        self.players = {}
        self.summary = {}
        
    def load_data(self):
        """載入資料"""
        try:
            # 載入比賽資料
            with open(self.data_path / 'matches.json', 'r', encoding='utf-8') as f:
                self.matches = json.load(f)
            
            # 載入選手資料
            with open(self.data_path / 'players.json', 'r', encoding='utf-8') as f:
                self.players = json.load(f)
            
            # 載入摘要資料
            with open(self.data_path / 'summary.json', 'r', encoding='utf-8') as f:
                self.summary = json.load(f)
            
            print(f"✅ 資料載入成功: {len(self.matches)} 場比賽, {len(self.players)} 位選手")
            return True
            
        except Exception as e:
            print(f"❌ 載入資料失敗: {e}")
            return False
    
    def analyze_seasons(self):
        """分析賽季統計"""
        print("\n" + "="*50)
        print("📊 賽季統計分析")
        print("="*50)
        
        season_stats = defaultdict(lambda: {
            'matches': 0,
            'players': set(),
            'venues': set(),
            'teams': set()
        })
        
        for match in self.matches:
            season = match['season']
            season_stats[season]['matches'] += 1
            season_stats[season]['players'].update(match['away_players'])
            season_stats[season]['players'].update(match['home_players'])
            season_stats[season]['venues'].add(match['venue'])
            season_stats[season]['teams'].add(match['away_team'])
            season_stats[season]['teams'].add(match['home_team'])
        
        for season, stats in season_stats.items():
            print(f"\n🏆 {season.upper()}")
            print(f"   比賽場次: {stats['matches']}")
            print(f"   參與選手: {len(stats['players'])}")
            print(f"   比賽場地: {len(stats['venues'])}")
            print(f"   參賽隊伍: {len(stats['teams'])}")
    
    def analyze_venues(self):
        """分析場地統計"""
        print("\n" + "="*50)
        print("🏟️ 場地統計分析")
        print("="*50)
        
        venue_stats = defaultdict(int)
        for match in self.matches:
            venue_stats[match['venue']] += 1
        
        # 按比賽場次排序
        sorted_venues = sorted(venue_stats.items(), key=lambda x: x[1], reverse=True)
        
        for venue, count in sorted_venues:
            percentage = (count / len(self.matches)) * 100
            print(f"📍 {venue:<20} {count:>3} 場 ({percentage:>5.1f}%)")
    
    def analyze_teams(self):
        """分析隊伍統計"""
        print("\n" + "="*50)
        print("🏀 隊伍統計分析")
        print("="*50)
        
        team_stats = defaultdict(lambda: {'matches': 0, 'wins': 0, 'players': set()})
        
        for match in self.matches:
            away_team = match['away_team']
            home_team = match['home_team']
            away_score = match['away_score']
            home_score = match['home_score']
            
            # 統計比賽場次
            team_stats[away_team]['matches'] += 1
            team_stats[home_team]['matches'] += 1
            
            # 統計勝場 (根據比分)
            if away_score > home_score:
                team_stats[away_team]['wins'] += 1
            elif home_score > away_score:
                team_stats[home_team]['wins'] += 1
            
            # 統計選手
            team_stats[away_team]['players'].update(match['away_players'])
            team_stats[home_team]['players'].update(match['home_players'])
        
        # 按勝率排序
        team_list = []
        for team, stats in team_stats.items():
            win_rate = (stats['wins'] / stats['matches']) * 100 if stats['matches'] > 0 else 0
            team_list.append((team, stats['matches'], stats['wins'], win_rate, len(stats['players'])))
        
        team_list.sort(key=lambda x: x[3], reverse=True)  # 按勝率排序
        
        print(f"{'隊伍名稱':<15} {'比賽':<4} {'勝場':<4} {'勝率':<6} {'選手數':<4}")
        print("-" * 40)
        for team, matches, wins, win_rate, player_count in team_list:
            print(f"{team:<15} {matches:<4} {wins:<4} {win_rate:>5.1f}% {player_count:<4}")
    
    def analyze_top_players(self):
        """分析頂級選手"""
        print("\n" + "="*50)
        print("🏆 頂級選手分析")
        print("="*50)
        
        # 過濾出比賽場次>=10的選手
        qualified_players = {name: data for name, data in self.players.items() 
                           if data['total_games'] >= 10}
        
        print(f"📊 符合條件選手 (>=10場比賽): {len(qualified_players)}")
        
        # 總勝率排行榜
        print(f"\n🥇 總勝率排行榜 (前10名)")
        print(f"{'排名':<4} {'選手':<12} {'比賽':<4} {'勝場':<4} {'勝率':<6} {'隊伍'}")
        print("-" * 50)
        
        sorted_by_winrate = sorted(qualified_players.items(), 
                                 key=lambda x: x[1]['total_wins']/x[1]['total_games'], 
                                 reverse=True)
        
        for i, (name, data) in enumerate(sorted_by_winrate[:10], 1):
            win_rate = (data['total_wins'] / data['total_games']) * 100
            teams = ', '.join(data['teams'][:2])  # 只顯示前兩個隊伍
            print(f"{i:<4} {name:<12} {data['total_games']:<4} {data['total_wins']:<4} {win_rate:>5.1f}% {teams}")
        
        # 出賽場次排行榜
        print(f"\n🎯 出賽場次排行榜 (前10名)")
        print(f"{'排名':<4} {'選手':<12} {'比賽':<4} {'勝場':<4} {'勝率':<6} {'隊伍'}")
        print("-" * 50)
        
        sorted_by_games = sorted(qualified_players.items(), 
                               key=lambda x: x[1]['total_games'], 
                               reverse=True)
        
        for i, (name, data) in enumerate(sorted_by_games[:10], 1):
            win_rate = (data['total_wins'] / data['total_games']) * 100
            teams = ', '.join(data['teams'][:2])
            print(f"{i:<4} {name:<12} {data['total_games']:<4} {data['total_wins']:<4} {win_rate:>5.1f}% {teams}")
    
    def analyze_game_types(self):
        """分析遊戲類型統計"""
        print("\n" + "="*50)
        print("🎮 遊戲類型統計")
        print("="*50)
        
        game_type_stats = defaultdict(int)
        total_sets = 0
        
        for match in self.matches:
            for game_set in match['matches']:
                game_type_stats[game_set['type']] += 1
                total_sets += 1
        
        print(f"總SET數: {total_sets}")
        print()
        
        for game_type, count in game_type_stats.items():
            percentage = (count / total_sets) * 100
            type_name = "501遊戲" if game_type == "01" else "Cricket遊戲"
            print(f"🎯 {type_name}: {count} SET ({percentage:.1f}%)")
    
    def analyze_first_attack_advantage(self):
        """分析先攻優勢"""
        print("\n" + "="*50)
        print("⚡ 先攻優勢分析")
        print("="*50)
        
        first_attack_stats = {
            'total': 0,
            'first_attack_wins': 0,
            'by_type': defaultdict(lambda: {'total': 0, 'first_wins': 0})
        }
        
        for match in self.matches:
            for game_set in match['matches']:
                first_attack = game_set['firstAttack']
                winner = game_set['winner']
                game_type = game_set['type']
                
                first_attack_stats['total'] += 1
                first_attack_stats['by_type'][game_type]['total'] += 1
                
                if first_attack == winner:
                    first_attack_stats['first_attack_wins'] += 1
                    first_attack_stats['by_type'][game_type]['first_wins'] += 1
        
        # 整體先攻勝率
        overall_rate = (first_attack_stats['first_attack_wins'] / first_attack_stats['total']) * 100
        print(f"📊 整體先攻勝率: {first_attack_stats['first_attack_wins']}/{first_attack_stats['total']} ({overall_rate:.1f}%)")
        
        # 分遊戲類型
        print()
        for game_type, stats in first_attack_stats['by_type'].items():
            rate = (stats['first_wins'] / stats['total']) * 100
            type_name = "501遊戲" if game_type == "01" else "Cricket遊戲"
            print(f"🎯 {type_name}先攻勝率: {stats['first_wins']}/{stats['total']} ({rate:.1f}%)")
    
    def generate_report(self):
        """生成完整報告"""
        print("🎯 難找的聯賽 - 資料分析報告")
        print("=" * 60)
        print(f"📅 報告生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📊 資料範圍: Season 3 & Season 4")
        print(f"🏆 總比賽場次: {len(self.matches)}")
        print(f"👥 總選手人數: {len(self.players)}")
        
        # 執行各項分析
        self.analyze_seasons()
        self.analyze_venues()
        self.analyze_teams()
        self.analyze_top_players()
        self.analyze_game_types()
        self.analyze_first_attack_advantage()
        
        print("\n" + "="*60)
        print("📋 資料品質檢查")
        print("="*60)
        
        # 檢查資料完整性
        incomplete_matches = 0
        for match in self.matches:
            if match['away_score'] == 0 and match['home_score'] == 0:
                incomplete_matches += 1
        
        print(f"⚠️  未計分比賽: {incomplete_matches} 場")
        print(f"✅ 完整比賽: {len(self.matches) - incomplete_matches} 場")
        
        print("\n🎉 分析報告完成！")

def main():
    analyzer = DataAnalyzer()
    
    if not analyzer.load_data():
        sys.exit(1)
    
    analyzer.generate_report()

if __name__ == '__main__':
    main() 