#!/usr/bin/env python3
"""
HTML比賽結果解析器 - 將現有的HTML比賽資料轉換為Firebase格式
"""

import os
import re
import json
import sys
from datetime import datetime
from bs4 import BeautifulSoup
from pathlib import Path

class GameResultParser:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.game_result_path = self.base_path / "game_result"
        self.all_matches = []
        self.all_players = set()
        self.team_stats = {}
        
    def parse_html_file(self, file_path, season, game_number):
        """解析單個HTML檔案"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            soup = BeautifulSoup(content, 'html.parser')
            
            # 提取比賽基本資訊
            match_info = self.extract_match_info(soup)
            
            # 提取JavaScript中的比賽資料
            match_data = self.extract_match_data(content)
            
            if not match_data:
                print(f"警告: {file_path} 沒有找到比賽資料")
                return None
            
            # 整合資料
            game_result = {
                'season': season,
                'game_number': game_number,
                'date': match_info.get('date', ''),
                'venue': match_info.get('venue', ''),
                'away_team': match_info.get('away_team', ''),
                'home_team': match_info.get('home_team', ''),
                'away_score': match_info.get('away_score', 0),
                'home_score': match_info.get('home_score', 0),
                'matches': match_data['matches'],
                'drinking_bonus': match_data.get('drinking_bonus', {'away': 0, 'home': 0}),
                'away_players': match_data.get('away_players', []),
                'home_players': match_data.get('home_players', []),
                'file_path': str(file_path)
            }
            
            # 收集所有選手名單
            self.all_players.update(match_data.get('away_players', []))
            self.all_players.update(match_data.get('home_players', []))
            
            return game_result
            
        except Exception as e:
            print(f"錯誤: 解析 {file_path} 時發生錯誤: {e}")
            return None
    
    def extract_match_info(self, soup):
        """從HTML中提取比賽基本資訊"""
        match_info = {}
        
        # 比賽日期
        date_elem = soup.find('h2', class_='match-date')
        if date_elem:
            match_info['date'] = date_elem.get_text().strip()
        
        # 比賽場地
        venue_elem = soup.find('div', class_='venue-info')
        if venue_elem:
            match_info['venue'] = venue_elem.get_text().strip()
        
        # 隊伍名稱和比分
        away_team_elem = soup.find('div', class_='team away')
        home_team_elem = soup.find('div', class_='team home')
        
        if away_team_elem:
            team_name = away_team_elem.find('div', class_='team-name')
            team_score = away_team_elem.find('div', class_='team-score')
            if team_name:
                match_info['away_team'] = team_name.get_text().strip()
            if team_score:
                try:
                    match_info['away_score'] = int(team_score.get_text().strip())
                except:
                    match_info['away_score'] = 0
        
        if home_team_elem:
            team_name = home_team_elem.find('div', class_='team-name')
            team_score = home_team_elem.find('div', class_='team-score')
            if team_name:
                match_info['home_team'] = team_name.get_text().strip()
            if team_score:
                try:
                    match_info['home_score'] = int(team_score.get_text().strip())
                except:
                    match_info['home_score'] = 0
        
        return match_info
    
    def extract_match_data(self, content):
        """從HTML的JavaScript中提取比賽資料"""
        # 尋找JavaScript中的比賽資料
        matches_pattern = r'const\s+g\d+Matches\s*=\s*(\[[\s\S]*?\]);'
        drinking_pattern = r'const\s+drinkingBonus\s*=\s*(\{[\s\S]*?\});'
        away_players_pattern = r'const\s+awayPlayers\s*=\s*(\[[\s\S]*?\]);'
        home_players_pattern = r'const\s+homePlayers\s*=\s*(\[[\s\S]*?\]);'
        
        matches_match = re.search(matches_pattern, content)
        drinking_match = re.search(drinking_pattern, content)
        away_players_match = re.search(away_players_pattern, content)
        home_players_match = re.search(home_players_pattern, content)
        
        if not matches_match:
            return None
        
        try:
            # 解析比賽資料
            matches_str = matches_match.group(1)
            matches_str = self.clean_js_array(matches_str)
            matches = json.loads(matches_str)
            
            result = {'matches': matches}
            
            # 解析飲酒加成
            if drinking_match:
                drinking_str = drinking_match.group(1)
                drinking_str = self.clean_js_object(drinking_str)
                result['drinking_bonus'] = json.loads(drinking_str)
            
            # 解析選手名單
            if away_players_match:
                away_str = away_players_match.group(1)
                away_str = self.clean_js_array(away_str)
                result['away_players'] = json.loads(away_str)
            
            if home_players_match:
                home_str = home_players_match.group(1)
                home_str = self.clean_js_array(home_str)
                result['home_players'] = json.loads(home_str)
            
            return result
            
        except Exception as e:
            print(f"解析JavaScript資料時發生錯誤: {e}")
            # Debug: 印出問題字串
            if matches_match:
                print(f"原始matches字串: {matches_match.group(1)[:200]}...")
                print(f"清理後matches字串: {self.clean_js_array(matches_match.group(1))[:200]}...")
            return None
    
    def clean_js_array(self, js_str):
        """清理JavaScript陣列字串使其可以被Python eval"""
        # 移除註釋
        js_str = re.sub(r'//.*$', '', js_str, flags=re.MULTILINE)
        # 替換單引號為雙引號 (更精確的匹配)
        js_str = re.sub(r"'([^']*)'", r'"\1"', js_str)
        # 處理物件鍵名 (無引號的鍵名)
        js_str = re.sub(r'(\w+):', r'"\1":', js_str)
        return js_str
    
    def clean_js_object(self, js_str):
        """清理JavaScript物件字串使其可以被Python eval"""
        # 移除註釋
        js_str = re.sub(r'//.*$', '', js_str, flags=re.MULTILINE)
        # 替換單引號為雙引號
        js_str = re.sub(r"'([^']*)'", r'"\1"', js_str)
        # 處理物件鍵名 (無引號的鍵名)
        js_str = re.sub(r'(\w+):', r'"\1":', js_str)
        return js_str
    
    def parse_all_games(self):
        """解析所有比賽檔案"""
        seasons = ['season3', 'season4']
        
        for season in seasons:
            season_path = self.game_result_path / season
            if not season_path.exists():
                print(f"警告: {season_path} 不存在")
                continue
            
            print(f"解析 {season}...")
            
            # 獲取所有HTML檔案並排序
            html_files = sorted([f for f in season_path.glob('g*.html')])
            
            for html_file in html_files:
                # 從檔案名提取遊戲編號
                game_match = re.match(r'g(\d+)\.html', html_file.name)
                if not game_match:
                    continue
                
                game_number = int(game_match.group(1))
                print(f"  解析 {html_file.name}...")
                
                game_result = self.parse_html_file(html_file, season, game_number)
                if game_result:
                    self.all_matches.append(game_result)
        
        print(f"完成解析，共 {len(self.all_matches)} 場比賽")
        print(f"共發現 {len(self.all_players)} 位選手")
    
    def generate_player_stats(self):
        """生成選手統計資料"""
        player_stats = {}
        
        for player in self.all_players:
            player_stats[player] = {
                'name': player,
                'total_games': 0,
                'total_wins': 0,
                'o1_games': 0,
                'o1_wins': 0,
                'cr_games': 0,
                'cr_wins': 0,
                'first_attacks': 0,
                'seasons': set(),
                'teams': set()
            }
        
        # 統計每場比賽
        for game in self.all_matches:
            season = game['season']
            
            # 記錄選手所屬隊伍
            for player in game['away_players']:
                if player in player_stats:
                    player_stats[player]['seasons'].add(season)
                    player_stats[player]['teams'].add(game['away_team'])
            
            for player in game['home_players']:
                if player in player_stats:
                    player_stats[player]['seasons'].add(season)
                    player_stats[player]['teams'].add(game['home_team'])
            
            # 統計比賽資料
            for match in game['matches']:
                away_players = match['away'] if isinstance(match['away'], list) else [match['away']]
                home_players = match['home'] if isinstance(match['home'], list) else [match['home']]
                
                match_type = match['type']
                first_attack = match['firstAttack']
                winner = match['winner']
                
                # 統計客隊選手
                for player in away_players:
                    if player in player_stats:
                        player_stats[player]['total_games'] += 1
                        if match_type == '01':
                            player_stats[player]['o1_games'] += 1
                        elif match_type == 'CR':
                            player_stats[player]['cr_games'] += 1
                        
                        if first_attack == 'away':
                            player_stats[player]['first_attacks'] += 1
                        
                        if winner == 'away':
                            player_stats[player]['total_wins'] += 1
                            if match_type == '01':
                                player_stats[player]['o1_wins'] += 1
                            elif match_type == 'CR':
                                player_stats[player]['cr_wins'] += 1
                
                # 統計主隊選手
                for player in home_players:
                    if player in player_stats:
                        player_stats[player]['total_games'] += 1
                        if match_type == '01':
                            player_stats[player]['o1_games'] += 1
                        elif match_type == 'CR':
                            player_stats[player]['cr_games'] += 1
                        
                        if first_attack == 'home':
                            player_stats[player]['first_attacks'] += 1
                        
                        if winner == 'home':
                            player_stats[player]['total_wins'] += 1
                            if match_type == '01':
                                player_stats[player]['o1_wins'] += 1
                            elif match_type == 'CR':
                                player_stats[player]['cr_wins'] += 1
        
        # 轉換set為list以便JSON序列化
        for player in player_stats:
            player_stats[player]['seasons'] = list(player_stats[player]['seasons'])
            player_stats[player]['teams'] = list(player_stats[player]['teams'])
        
        return player_stats
    
    def save_to_json(self, output_dir='firebase_data'):
        """將解析的資料儲存為JSON檔案"""
        output_path = self.base_path / output_dir
        output_path.mkdir(exist_ok=True)
        
        # 儲存所有比賽資料
        matches_file = output_path / 'matches.json'
        with open(matches_file, 'w', encoding='utf-8') as f:
            json.dump(self.all_matches, f, ensure_ascii=False, indent=2)
        print(f"比賽資料已儲存至: {matches_file}")
        
        # 生成並儲存選手統計
        player_stats = self.generate_player_stats()
        players_file = output_path / 'players.json'
        with open(players_file, 'w', encoding='utf-8') as f:
            json.dump(player_stats, f, ensure_ascii=False, indent=2)
        print(f"選手統計已儲存至: {players_file}")
        
        # 儲存摘要資訊
        summary = {
            'total_matches': len(self.all_matches),
            'total_players': len(self.all_players),
            'seasons': ['season3', 'season4'],
            'last_updated': datetime.now().isoformat(),
            'players_list': sorted(list(self.all_players))
        }
        
        summary_file = output_path / 'summary.json'
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        print(f"摘要資訊已儲存至: {summary_file}")
        
        return output_path

def main():
    print("🎯 開始解析HTML比賽結果檔案...")
    
    parser = GameResultParser()
    
    # 解析所有比賽
    parser.parse_all_games()
    
    if not parser.all_matches:
        print("❌ 沒有找到任何比賽資料")
        return
    
    # 儲存為JSON
    output_path = parser.save_to_json()
    
    print(f"\n✅ 解析完成！")
    print(f"📁 輸出目錄: {output_path}")
    print(f"📊 總計: {len(parser.all_matches)} 場比賽, {len(parser.all_players)} 位選手")
    
    # 顯示一些統計資訊
    season3_count = len([m for m in parser.all_matches if m['season'] == 'season3'])
    season4_count = len([m for m in parser.all_matches if m['season'] == 'season4'])
    
    print(f"   Season 3: {season3_count} 場比賽")
    print(f"   Season 4: {season4_count} 場比賽")

if __name__ == '__main__':
    main() 