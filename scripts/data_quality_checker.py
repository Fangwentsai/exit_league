#!/usr/bin/env python3
"""
資料品質檢查器 - 檢查比賽資料中的隊名、場地名稱等問題
"""

import json
import sys
from pathlib import Path
from collections import defaultdict, Counter

class DataQualityChecker:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.data_path = self.base_path / "firebase_data"
        self.matches = []
        
    def load_matches_data(self):
        """載入比賽資料"""
        try:
            matches_file = self.data_path / 'matches.json'
            with open(matches_file, 'r', encoding='utf-8') as f:
                self.matches = json.load(f)
            
            print(f"✅ 載入比賽資料: {len(self.matches)} 場比賽")
            return True
            
        except Exception as e:
            print(f"❌ 載入比賽資料失敗: {e}")
            return False
    
    def check_team_names(self):
        """檢查隊伍名稱一致性"""
        print("\n" + "="*60)
        print("🏀 隊伍名稱檢查")
        print("="*60)
        
        team_counts = defaultdict(int)
        
        for match in self.matches:
            team_counts[match['away_team']] += 1
            team_counts[match['home_team']] += 1
        
        print(f"📊 發現 {len(team_counts)} 個不同的隊伍名稱:")
        sorted_teams = sorted(team_counts.items(), key=lambda x: x[1], reverse=True)
        
        for team, count in sorted_teams:
            print(f"   {team:<20} ({count:>2} 場)")
        
        # 檢查可能重複的隊名
        similar_teams = self.find_similar_team_names(list(team_counts.keys()))
        if similar_teams:
            print(f"\n⚠️  可能重複的隊名:")
            for group in similar_teams:
                print(f"   🔍 {group}")
        else:
            print(f"\n✅ 沒有發現明顯重複的隊名")
    
    def check_venue_names(self):
        """檢查場地名稱一致性"""
        print("\n" + "="*60)
        print("🏟️ 場地名稱檢查")
        print("="*60)
        
        venue_counts = defaultdict(int)
        
        for match in self.matches:
            venue_counts[match['venue']] += 1
        
        print(f"📊 發現 {len(venue_counts)} 個不同的場地名稱:")
        sorted_venues = sorted(venue_counts.items(), key=lambda x: x[1], reverse=True)
        
        for venue, count in sorted_venues:
            print(f"   {venue:<25} ({count:>2} 場)")
        
        # 檢查可能重複的場地名
        similar_venues = self.find_similar_venue_names(list(venue_counts.keys()))
        if similar_venues:
            print(f"\n⚠️  可能重複的場地名:")
            for group in similar_venues:
                print(f"   🔍 {group}")
        else:
            print(f"\n✅ 沒有發現明顯重複的場地名")
    
    def check_player_names(self):
        """檢查選手名稱一致性"""
        print("\n" + "="*60)
        print("👥 選手名稱檢查")
        print("="*60)
        
        player_counts = defaultdict(int)
        player_teams = defaultdict(set)
        
        for match in self.matches:
            for player in match['away_players']:
                player_counts[player] += 1
                player_teams[player].add(match['away_team'])
            
            for player in match['home_players']:
                player_counts[player] += 1
                player_teams[player].add(match['home_team'])
        
        print(f"📊 發現 {len(player_counts)} 位不同的選手")
        
        # 檢查出賽次數最多的選手
        print(f"\n🏆 出賽次數最多的選手 (前10名):")
        sorted_players = sorted(player_counts.items(), key=lambda x: x[1], reverse=True)
        for i, (player, count) in enumerate(sorted_players[:10], 1):
            teams = ', '.join(list(player_teams[player])[:2])  # 只顯示前兩個隊伍
            print(f"   {i:>2}. {player:<12} ({count:>3} 場) - {teams}")
        
        # 檢查可能重複的選手名
        similar_players = self.find_similar_player_names(list(player_counts.keys()))
        if similar_players:
            print(f"\n⚠️  可能重複的選手名:")
            for group in similar_players:
                print(f"   🔍 {group}")
        else:
            print(f"\n✅ 沒有發現明顯重複的選手名")
        
        # 檢查跨隊伍選手
        multi_team_players = {player: teams for player, teams in player_teams.items() if len(teams) > 1}
        if multi_team_players:
            print(f"\n🔄 跨隊伍選手 ({len(multi_team_players)} 位):")
            for player, teams in sorted(multi_team_players.items()):
                print(f"   {player:<12} - {', '.join(teams)}")
    
    def check_data_completeness(self):
        """檢查資料完整性"""
        print("\n" + "="*60)
        print("📋 資料完整性檢查")
        print("="*60)
        
        incomplete_matches = []
        empty_scores = 0
        missing_players = 0
        
        for match in self.matches:
            issues = []
            
            # 檢查比分
            if match['away_score'] == 0 and match['home_score'] == 0:
                empty_scores += 1
                issues.append("無比分")
            
            # 檢查選手名單
            if not match['away_players'] or not match['home_players']:
                missing_players += 1
                issues.append("缺少選手名單")
            
            # 檢查比賽內容
            if not match['matches']:
                issues.append("無比賽內容")
            
            if issues:
                incomplete_matches.append({
                    'game': f"{match['season']}_g{match['game_number']:03d}",
                    'date': match['date'],
                    'teams': f"{match['away_team']} vs {match['home_team']}",
                    'issues': issues
                })
        
        print(f"📊 資料完整性統計:")
        print(f"   總比賽場次: {len(self.matches)}")
        print(f"   無比分比賽: {empty_scores} 場")
        print(f"   缺少選手名單: {missing_players} 場")
        print(f"   有問題比賽: {len(incomplete_matches)} 場")
        
        if incomplete_matches:
            print(f"\n⚠️  有問題的比賽:")
            for match in incomplete_matches[:10]:  # 只顯示前10場
                print(f"   {match['game']}: {match['teams']} - {', '.join(match['issues'])}")
            
            if len(incomplete_matches) > 10:
                print(f"   ... 還有 {len(incomplete_matches) - 10} 場比賽有問題")
    
    def check_season_distribution(self):
        """檢查季節分布"""
        print("\n" + "="*60)
        print("📅 季節分布檢查")
        print("="*60)
        
        season_stats = defaultdict(lambda: {
            'matches': 0,
            'venues': set(),
            'teams': set(),
            'players': set(),
            'dates': []
        })
        
        for match in self.matches:
            season = match['season']
            stats = season_stats[season]
            
            stats['matches'] += 1
            stats['venues'].add(match['venue'])
            stats['teams'].add(match['away_team'])
            stats['teams'].add(match['home_team'])
            stats['players'].update(match['away_players'])
            stats['players'].update(match['home_players'])
            stats['dates'].append(match['date'])
        
        for season, stats in season_stats.items():
            print(f"\n🏆 {season.upper()}:")
            print(f"   比賽場次: {stats['matches']}")
            print(f"   參與場地: {len(stats['venues'])}")
            print(f"   參賽隊伍: {len(stats['teams'])}")
            print(f"   參與選手: {len(stats['players'])}")
            
            # 日期範圍
            if stats['dates']:
                dates = sorted(stats['dates'])
                print(f"   日期範圍: {dates[0]} ~ {dates[-1]}")
    
    def find_similar_team_names(self, team_names):
        """找出可能重複的隊名"""
        similar_groups = []
        processed = set()
        
        for team in team_names:
            if team in processed:
                continue
                
            similar = [team]
            for other_team in team_names:
                if other_team != team and other_team not in processed:
                    # 檢查相似度
                    if self.are_similar_names(team, other_team):
                        similar.append(other_team)
            
            if len(similar) > 1:
                similar_groups.append(similar)
                processed.update(similar)
        
        return similar_groups
    
    def find_similar_venue_names(self, venue_names):
        """找出可能重複的場地名"""
        similar_groups = []
        processed = set()
        
        for venue in venue_names:
            if venue in processed:
                continue
                
            similar = [venue]
            for other_venue in venue_names:
                if other_venue != venue and other_venue not in processed:
                    # 檢查相似場地名
                    if self.are_similar_venues(venue, other_venue):
                        similar.append(other_venue)
            
            if len(similar) > 1:
                similar_groups.append(similar)
                processed.update(similar)
        
        return similar_groups
    
    def find_similar_player_names(self, player_names):
        """找出可能重複的選手名"""
        similar_groups = []
        processed = set()
        
        for player in player_names:
            if player in processed:
                continue
                
            similar = [player]
            for other_player in player_names:
                if other_player != player and other_player not in processed:
                    # 檢查相似選手名
                    if self.are_similar_names(player, other_player):
                        similar.append(other_player)
            
            if len(similar) > 1:
                similar_groups.append(similar)
                processed.update(similar)
        
        return similar_groups
    
    def are_similar_names(self, name1, name2):
        """判斷兩個名稱是否相似"""
        # 移除空格比較
        clean1 = name1.replace(' ', '').replace('　', '')
        clean2 = name2.replace(' ', '').replace('　', '')
        
        # 長度差異不超過2
        if abs(len(clean1) - len(clean2)) > 2:
            return False
        
        # 一個包含另一個
        if clean1 in clean2 or clean2 in clean1:
            return True
        
        # 編輯距離小於等於2
        return self.edit_distance(clean1, clean2) <= 2
    
    def are_similar_venues(self, venue1, venue2):
        """判斷兩個場地名是否相似"""
        # 移除空格和常見詞彙
        clean1 = venue1.replace(' ', '').replace('Bar', '').replace('bar', '').replace('吧', '')
        clean2 = venue2.replace(' ', '').replace('Bar', '').replace('bar', '').replace('吧', '')
        
        # 一個包含另一個
        if clean1 in clean2 or clean2 in clean1:
            return True
        
        return False
    
    def edit_distance(self, s1, s2):
        """計算編輯距離"""
        if len(s1) < len(s2):
            return self.edit_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def generate_correction_suggestions(self):
        """生成修正建議"""
        print("\n" + "="*60)
        print("💡 修正建議")
        print("="*60)
        
        suggestions = []
        
        # 場地名稱建議
        venue_counts = defaultdict(int)
        for match in self.matches:
            venue_counts[match['venue']] += 1
        
        venue_suggestions = {
            '逃生入口Exit Bar': '逃生入口 Bar',
            '逃生入口Bar': '逃生入口 Bar',
            '逃生入口吧': '逃生入口 Bar',
            'ViVi Bar': 'Vivi Bar',
            'Jack Bar': 'Jack',
            'Jack Bar (飲酒平手+2)': 'Jack'
        }
        
        print("🏟️ 場地名稱標準化建議:")
        for old_name, new_name in venue_suggestions.items():
            if old_name in venue_counts:
                print(f"   '{old_name}' → '{new_name}' ({venue_counts[old_name]} 場)")
        
        # 隊伍名稱建議
        team_counts = defaultdict(int)
        for match in self.matches:
            team_counts[match['away_team']] += 1
            team_counts[match['home_team']] += 1
        
        team_suggestions = {
            'ViVi朝酒晚舞': 'Vivi朝酒晚舞',
            '海盜揪硬': '酒窩海盜聯盟',
            '海盜揪難': '酒窩海盜聯盟',
            '人生揪硬': '人生揪難',
            '人生揪難': '人生揪難'
        }
        
        print(f"\n🏀 隊伍名稱標準化建議:")
        for old_name, new_name in team_suggestions.items():
            if old_name in team_counts:
                print(f"   '{old_name}' → '{new_name}' ({team_counts[old_name]} 場)")
    
    def run_all_checks(self):
        """執行所有檢查"""
        print("🔍 資料品質檢查器")
        print("=" * 60)
        
        if not self.load_matches_data():
            return False
        
        # 執行各項檢查
        self.check_season_distribution()
        self.check_venue_names()
        self.check_team_names()
        self.check_player_names()
        self.check_data_completeness()
        self.generate_correction_suggestions()
        
        print(f"\n🎉 資料品質檢查完成！")
        print(f"📊 建議在上傳Firebase前先修正發現的問題")
        
        return True

def main():
    checker = DataQualityChecker()
    
    if not checker.run_all_checks():
        sys.exit(1)

if __name__ == '__main__':
    main() 