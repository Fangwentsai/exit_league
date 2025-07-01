#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import re
from bs4 import BeautifulSoup

def load_standard_players():
    """載入標準化的選手名單"""
    with open('data/player_by_season.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def extract_players_from_html(html_file):
    """從HTML檔案中提取參賽選手名單"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    # 提取隊伍名稱
    team_elements = soup.find_all('div', class_='team-name')
    if len(team_elements) >= 2:
        away_team = team_elements[0].text.strip()
        home_team = team_elements[1].text.strip()
    else:
        return None, None, [], []
    
    # 從JavaScript中提取選手名單
    script_tags = soup.find_all('script')
    away_players = []
    home_players = []
    
    for script in script_tags:
        if script.string and 'awayPlayers' in script.string:
            # 提取awayPlayers
            away_match = re.search(r'const awayPlayers = \[(.*?)\];', script.string, re.DOTALL)
            if away_match:
                away_players_str = away_match.group(1)
                # 清理並提取選手名稱
                away_players = [name.strip().strip("'\"") for name in away_players_str.split(',') if name.strip()]
            
            # 提取homePlayers
            home_match = re.search(r'const homePlayers = \[(.*?)\];', script.string, re.DOTALL)
            if home_match:
                home_players_str = home_match.group(1)
                # 清理並提取選手名稱
                home_players = [name.strip().strip("'\"") for name in home_players_str.split(',') if name.strip()]
    
    return away_team, home_team, away_players, home_players

def check_season3_matches():
    """檢查Season 3所有比賽的參賽者名單"""
    standard_data = load_standard_players()
    season3_standard = {}
    
    # 建立標準名單字典
    for team, seasons in standard_data.items():
        if 'season3' in seasons and seasons['season3']:
            season3_standard[team] = set(seasons['season3'])
    
    print("=== Season 3 標準化名單 ===")
    for team, players in season3_standard.items():
        print(f"{team}: {sorted(list(players))}")
    print("\n" + "="*50 + "\n")
    
    # 檢查所有比賽檔案
    season3_dir = 'game_result/season3'
    discrepancies = []
    
    # 取得所有比賽檔案並排序
    game_files = [f for f in os.listdir(season3_dir) if f.endswith('.html')]
    game_files.sort(key=lambda x: int(x[1:-5]))  # 根據比賽編號排序
    
    for game_file in game_files:
        game_path = os.path.join(season3_dir, game_file)
        game_num = game_file[1:-5]  # 取得比賽編號
        
        try:
            away_team, home_team, away_players, home_players = extract_players_from_html(game_path)
            
            if not away_team or not home_team:
                print(f"⚠️  G{game_num}: 無法提取隊伍資訊")
                continue
            
            print(f"🏆 G{game_num}: {away_team} vs {home_team}")
            
            # 檢查客隊
            if away_team in season3_standard:
                away_standard = season3_standard[away_team]
                away_actual = set(away_players)
                
                missing = away_standard - away_actual
                extra = away_actual - away_standard
                
                if missing or extra:
                    discrepancies.append({
                        'game': game_num,
                        'team': away_team,
                        'type': 'away',
                        'missing': list(missing),
                        'extra': list(extra),
                        'actual': away_players,
                        'standard': list(away_standard)
                    })
                    print(f"   ❌ {away_team} 名單不符:")
                    if missing:
                        print(f"      缺少: {list(missing)}")
                    if extra:
                        print(f"      多出: {list(extra)}")
                else:
                    print(f"   ✅ {away_team} 名單符合")
            else:
                print(f"   ⚠️  {away_team} 不在標準名單中")
            
            # 檢查主隊
            if home_team in season3_standard:
                home_standard = season3_standard[home_team]
                home_actual = set(home_players)
                
                missing = home_standard - home_actual
                extra = home_actual - home_standard
                
                if missing or extra:
                    discrepancies.append({
                        'game': game_num,
                        'team': home_team,
                        'type': 'home',
                        'missing': list(missing),
                        'extra': list(extra),
                        'actual': home_players,
                        'standard': list(home_standard)
                    })
                    print(f"   ❌ {home_team} 名單不符:")
                    if missing:
                        print(f"      缺少: {list(missing)}")
                    if extra:
                        print(f"      多出: {list(extra)}")
                else:
                    print(f"   ✅ {home_team} 名單符合")
            else:
                print(f"   ⚠️  {home_team} 不在標準名單中")
            
            print()
            
        except Exception as e:
            print(f"❌ G{game_num}: 處理檔案時發生錯誤 - {str(e)}")
            continue
    
    # 總結報告
    print("\n" + "="*50)
    print("🔍 檢查結果總結")
    print("="*50)
    
    if discrepancies:
        print(f"發現 {len(discrepancies)} 個名單不符的情況:")
        for disc in discrepancies:
            print(f"\n📋 G{disc['game']} - {disc['team']}:")
            print(f"   實際名單: {disc['actual']}")
            print(f"   標準名單: {disc['standard']}")
            if disc['missing']:
                print(f"   缺少選手: {disc['missing']}")
            if disc['extra']:
                print(f"   多出選手: {disc['extra']}")
    else:
        print("🎉 所有比賽的參賽者名單都符合標準化名單！")

if __name__ == "__main__":
    check_season3_matches() 