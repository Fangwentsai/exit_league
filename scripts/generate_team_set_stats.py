#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os

def analyze_team_set_performance():
    """分析所有隊伍的SET 1-16表現"""
    
    # 讀取Firebase數據
    with open('firebase_data/season3_matches.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 隊伍列表
    teams = ['Vivi朝酒晚舞', '海盜揪硬', '醉販', '酒空組', 'Jack', '逃生入口C', '逃生入口A', '人生揪難']
    
    # 隊伍基本資訊
    teams_info = {
        'Vivi朝酒晚舞': {
            'venue': 'ViVi Bar',
            'address': '新北市永和區永貞路177號',
            'drink_bonus': 65,
            'stats': {'wins': 11, 'losses': 1, 'draws': 2, 'total_points': 351, 'rank': 1},
            'emoji': '🍻',
            'filename': 'vivi.html'
        },
        '海盜揪硬': {
            'venue': '酒窩海盜聯盟',
            'address': '新北市永和區得和路107號B1',
            'drink_bonus': 10,
            'stats': {'wins': 12, 'losses': 1, 'draws': 1, 'total_points': 333, 'rank': 2},
            'emoji': '🏴‍☠️',
            'filename': 'pirate.html'
        },
        '醉販': {
            'venue': '醉販',
            'address': '醉販Bar',
            'drink_bonus': 30,
            'stats': {'wins': 9, 'losses': 5, 'draws': 0, 'total_points': 250, 'rank': 3},
            'emoji': '🍺',
            'filename': 'drunk-vendor.html'
        },
        '酒空組': {
            'venue': '逃生入口 Bar',
            'address': '新北市永和區永貞路75號',
            'drink_bonus': 27,
            'stats': {'wins': 6, 'losses': 7, 'draws': 1, 'total_points': 232, 'rank': 4},
            'emoji': '🍷',
            'filename': 'jiukong.html'
        },
        'Jack': {
            'venue': 'Jack Bar',
            'address': '新北市永和區永亨路130號',
            'drink_bonus': 57,
            'stats': {'wins': 4, 'losses': 10, 'draws': 0, 'total_points': 230, 'rank': 5},
            'emoji': '🎯',
            'filename': 'jack.html'
        },
        '逃生入口C': {
            'venue': '逃生入口 Bar',
            'address': '新北市永和區永貞路75號',
            'drink_bonus': 22,
            'stats': {'wins': 5, 'losses': 9, 'draws': 0, 'total_points': 217, 'rank': 6},
            'emoji': '🚪',
            'filename': 'exit-c.html'
        },
        '逃生入口A': {
            'venue': '逃生入口 Bar',
            'address': '新北市永和區永貞路75號',
            'drink_bonus': 20,
            'stats': {'wins': 5, 'losses': 8, 'draws': 1, 'total_points': 208, 'rank': 7},
            'emoji': '🔓',
            'filename': 'exit-a.html'
        },
        '人生揪難': {
            'venue': '酒窩海盜聯盟',
            'address': '新北市永和區得和路107號B1',
            'drink_bonus': 47,
            'stats': {'wins': 1, 'losses': 12, 'draws': 1, 'total_points': 190, 'rank': 8},
            'emoji': '😵',
            'filename': 'life-hard.html'
        }
    }
    
    def get_drink_rating(bonus):
        if bonus >= 50:
            return '極高 ⭐⭐⭐⭐⭐'
        elif bonus >= 40:
            return '高 ⭐⭐⭐⭐'
        elif bonus >= 30:
            return '中高 ⭐⭐⭐'
        elif bonus >= 20:
            return '中等 ⭐⭐'
        else:
            return '低 ⭐'
    
    # 分析每支隊伍的SET表現
    all_teams_set_stats = {}
    
    for team in teams:
        team_set_stats = {}
        for i in range(1, 17):
            team_set_stats[i] = {'played': 0, 'won': 0}
        
        for game_data in data:
            away_team = game_data.get('away_team', '')
            home_team = game_data.get('home_team', '')
            
            if team not in away_team and team not in home_team:
                continue
            
            is_team_away = away_team == team
            
            for match in game_data.get('matches', []):
                set_num = match.get('set', 0)
                winner = match.get('winner')
                
                if set_num >= 1 and set_num <= 16:
                    team_set_stats[set_num]['played'] += 1
                    
                    # 判斷隊伍是否獲勝
                    if (is_team_away and winner == 'away') or (not is_team_away and winner == 'home'):
                        team_set_stats[set_num]['won'] += 1
        
        # 計算勝率
        set_data = []
        total_played = 0
        total_won = 0
        
        for set_num in range(1, 17):
            played = team_set_stats[set_num]['played']
            won = team_set_stats[set_num]['won']
            win_rate = (won / played * 100) if played > 0 else 0
            
            total_played += played
            total_won += won
            
            set_data.append({
                'set': set_num,
                'played': played,
                'won': won,
                'winRate': round(win_rate, 1)
            })
        
        overall_win_rate = (total_won / total_played * 100) if total_played > 0 else 0
        
        all_teams_set_stats[team] = {
            'info': teams_info[team],
            'set_data': set_data,
            'overall_stats': {
                'total_played': total_played,
                'total_won': total_won,
                'overall_win_rate': round(overall_win_rate, 1)
            }
        }
    
    return all_teams_set_stats

def generate_team_html(team_name, team_data):
    """生成隊伍詳細頁面的HTML"""
    
    info = team_data['info']
    set_data = team_data['set_data']
    stats = info['stats']
    
    def get_drink_rating(bonus):
        if bonus >= 50:
            return f'極高 ⭐⭐⭐⭐⭐ ({bonus}分)'
        elif bonus >= 40:
            return f'高 ⭐⭐⭐⭐ ({bonus}分)'
        elif bonus >= 30:
            return f'中高 ⭐⭐⭐ ({bonus}分)'
        elif bonus >= 20:
            return f'中等 ⭐⭐ ({bonus}分)'
        else:
            return f'低 ⭐ ({bonus}分)'
    
    drink_rating = get_drink_rating(info['drink_bonus'])
    win_rate = round((stats['wins'] / (stats['wins'] + stats['losses'] + stats['draws']) * 100), 1)
    
    # 生成SET數據的JavaScript陣列
    set_data_js = ',\n            '.join([
        f"{{set: {data['set']}, played: {data['played']}, won: {data['won']}, winRate: {data['winRate']}}}"
        for data in set_data
    ])
    
    # 變數名稱（移除特殊字符）
    var_name = team_name.replace('朝酒晚舞', '').replace('揪硬', '').replace('揪難', '').replace('入口', '').replace(' ', '')
    
    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="../styles/team-detail.css">
    <title>{team_name} - 進階數據 | 難找的聯賽</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <!-- 上方30% - 隊伍簡介 -->
        <div class="team-header">
            <div class="team-info">
                <div class="team-logo">{info['emoji']}</div>
                <div class="team-details">
                    <h1 class="team-name">{team_name}</h1>
                    <div class="team-meta">
                        <div class="meta-item">
                            <span class="meta-label">主場地址</span>
                            <span class="meta-value">{info['address']}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">飲酒強度</span>
                            <span class="meta-value">{drink_rating}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">聯賽排名</span>
                            <span class="meta-value">#{info['stats']['rank']}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 下方70% - 進階數據 -->
        <div class="stats-section">
            <!-- 分頁籤 -->
            <div class="tabs">
                <button class="tab-btn active" data-tab="season3">第三屆</button>
                <button class="tab-btn" data-tab="total">合計</button>
            </div>

            <!-- 第三屆數據 -->
            <div class="tab-content active" id="season3">
                <!-- 基本統計 -->
                <div class="basic-stats">
                    <div class="stat-card">
                        <div class="stat-number">{stats['wins'] + stats['losses'] + stats['draws']}</div>
                        <div class="stat-label">參賽場次</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{stats['wins']}</div>
                        <div class="stat-label">獲勝場次</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{win_rate}%</div>
                        <div class="stat-label">平均勝率</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{stats['total_points']}</div>
                        <div class="stat-label">總積分</div>
                    </div>
                </div>

                <!-- SET分析 -->
                <div class="set-analysis">
                    <h3>SET 1-16 表現分析</h3>
                    <div class="chart-container">
                        <canvas id="setChart"></canvas>
                    </div>
                    <div class="set-stats-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>SET</th>
                                    <th>出賽</th>
                                    <th>勝場</th>
                                    <th>勝率</th>
                                </tr>
                            </thead>
                            <tbody id="setStatsTable">
                                <!-- 數據將由JavaScript填入 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 合計數據 -->
            <div class="tab-content" id="total">
                <div class="basic-stats">
                    <div class="stat-card">
                        <div class="stat-number">{stats['wins'] + stats['losses'] + stats['draws']}</div>
                        <div class="stat-label">參賽場次</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{stats['wins']}</div>
                        <div class="stat-label">獲勝場次</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{win_rate}%</div>
                        <div class="stat-label">平均勝率</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{stats['total_points']}</div>
                        <div class="stat-label">總積分</div>
                    </div>
                </div>
                <p class="coming-soon">更多賽季數據即將推出...</p>
            </div>
        </div>
    </div>

    <script src="../js/team-detail.js"></script>
    <script>
        // {team_name}的SET數據
        const {var_name}SetData = [
            {set_data_js}
        ];

        // 初始化頁面
        initializeTeamDetail({var_name}SetData);
    </script>
</body>
</html>'''
    
    return html_content

def main():
    """主函數"""
    print("正在分析所有隊伍的SET表現...")
    
    # 分析所有隊伍數據
    all_teams_data = analyze_team_set_performance()
    
    # 輸出統計報告
    print("\n=== 所有隊伍SET表現統計 ===")
    for team_name, team_data in all_teams_data.items():
        overall = team_data['overall_stats']
        info = team_data['info']
        print(f"\n{team_name}:")
        print(f"  整體SET勝率: {overall['overall_win_rate']}% ({overall['total_won']}/{overall['total_played']})")
        print(f"  比賽勝率: {round((info['stats']['wins'] / (info['stats']['wins'] + info['stats']['losses'] + info['stats']['draws']) * 100), 1)}%")
        print(f"  檔案名稱: {info['filename']}")
    
    # 生成HTML文件
    print("\n正在生成HTML文件...")
    pages_dir = 'pages'
    
    for team_name, team_data in all_teams_data.items():
        filename = team_data['info']['filename']
        html_content = generate_team_html(team_name, team_data)
        
        filepath = os.path.join(pages_dir, filename)
        
        # 檢查文件是否已存在
        if os.path.exists(filepath):
            print(f"  跳過 {filename} (文件已存在)")
            continue
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"  ✅ 生成 {filename}")
    
    print("\n✅ 所有隊伍頁面生成完成！")

if __name__ == "__main__":
    main() 