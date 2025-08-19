"""
測試 g04 比賽的選手統計功能
使用亂數資料來模擬真實的比賽情況
"""

import json
import requests
import random
from datetime import datetime

# Google Apps Script 部署 URL
SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBJwojHfXLvm_uMTd1aalSrKyD3pRjIJ5IJr0jpHFFNyMf8ga4mZ_74-p0RvCIYPro/exec'

def generate_random_game_data():
    """生成 g04 的亂數比賽資料"""
    
    # 隊伍和選手資料
    teams = {
        'away': 'Jack',
        'home': '逃生入口C'
    }
    
    # 選手名單（從 player.json 中取得）
    players = {
        'Jack': ['小建', '阿福', 'B哥', '阿俊', '老師', '大根毛', 'Stan', '小魚', '小虎', '發哥', 'Terry', '阿元', '小胖', '祐祐', '雯雯', '小準', '阿翰'],
        '逃生入口C': ['Lucas', 'Eric', '傑西', '乳來', '承翰', '小東', '小歪', '阿誠', '阿隼', '少博', '阿樂', '土豆']
    }
    
    # 生成每個 SET 的資料
    sets = []
    for i in range(1, 17):
        # 根據 SET 類型決定選手數量
        if i <= 5:  # SET1-5: 雙人賽
            away_players = random.sample(players['Jack'], 2)
            home_players = random.sample(players['逃生入口C'], 2)
        elif i <= 10:  # SET6-10: 雙人賽
            away_players = random.sample(players['Jack'], 2)
            home_players = random.sample(players['逃生入口C'], 2)
        elif i <= 14:  # SET11-14: 雙人賽
            away_players = random.sample(players['Jack'], 2)
            home_players = random.sample(players['逃生入口C'], 2)
        else:  # SET15-16: 四人賽
            away_players = random.sample(players['Jack'], 4)
            home_players = random.sample(players['逃生入口C'], 4)
        
        # 隨機決定勝負和先攻
        winner = random.choice(['away', 'home'])
        first_attack = random.choice(['away', 'home'])
        
        sets.append({
            'setNumber': i,
            'setType': f'SET{i}',
            'awayPlayers': away_players,
            'homePlayers': home_players,
            'firstAttack': first_attack,
            'winner': winner
        })
    
    # 生成比賽資料
    game_data = {
        'gameId': 'g04',
        'gameDate': '8/17',  # 只保留月和日
        'awayTeam': teams['away'],
        'homeTeam': teams['home'],
        'venue': '逃生入口 Bar',
        'sets': sets,
        'drinkingBonus': {
            'away': random.choice([0, 5]),
            'home': random.choice([0, 5])
        },
        'scores': {
            'home': {
                'original': random.randint(0, 20),
                'winBonus': random.randint(0, 10),
                'drinkBonus': random.choice([0, 5]),
                'total': random.randint(0, 35)
            },
            'away': {
                'original': random.randint(0, 20),
                'winBonus': random.randint(0, 10),
                'drinkBonus': random.choice([0, 5]),
                'total': random.randint(0, 35)
            }
        },
        'timestamp': datetime.now().isoformat()
    }
    
    return game_data

def generate_player_statistics(game_data):
    """根據比賽資料生成選手統計"""
    
    # 選手名單
    players = {
        'Jack': ['小建', '阿福', 'B哥', '阿俊', '老師', '大根毛', 'Stan', '小魚', '小虎', '發哥', 'Terry', '阿元', '小胖', '祐祐', '雯雯', '小準', '阿翰'],
        '逃生入口C': ['Lucas', 'Eric', '傑西', '乳來', '承翰', '小東', '小歪', '阿誠', '阿隼', '少博', '阿樂', '土豆']
    }
    
    def calculate_player_stats(player_name, team):
        o1_games = 0
        o1_wins = 0
        cr_games = 0
        cr_wins = 0
        first_attacks = 0
        
        for set_data in game_data['sets']:
            team_players = set_data['awayPlayers'] if team == 'away' else set_data['homePlayers']
            
            if player_name in team_players:
                # 判斷比賽類型
                set_num = set_data['setNumber']
                if 6 <= set_num <= 10:  # CR 比賽
                    cr_games += 1
                    if set_data['winner'] == team:
                        cr_wins += 1
                else:  # 01 比賽
                    o1_games += 1
                    if set_data['winner'] == team:
                        o1_wins += 1
                
                # 計算先攻次數
                if set_data['firstAttack'] == team:
                    first_attacks += 1
        
        return {
            'name': player_name,
            'o1Games': o1_games,
            'o1Wins': o1_wins,
            'crGames': cr_games,
            'crWins': cr_wins,
            'totalGames': o1_games + cr_games,
            'totalWins': o1_wins + cr_wins,
            'firstAttacks': first_attacks
        }
    
    # 生成客場選手統計
    away_stats = []
    for player in players['Jack']:
        stats = calculate_player_stats(player, 'away')
        if stats['totalGames'] > 0:  # 只包含有參與比賽的選手
            away_stats.append(stats)
    
    # 生成主場選手統計
    home_stats = []
    for player in players['逃生入口C']:
        stats = calculate_player_stats(player, 'home')
        if stats['totalGames'] > 0:  # 只包含有參與比賽的選手
            home_stats.append(stats)
    
    return {
        'away': away_stats,
        'home': home_stats
    }

def test_g04_player_stats():
    """測試 g04 的選手統計功能"""
    print("🚀 測試 g04 選手統計功能")
    print("=" * 50)
    
    # 生成亂數比賽資料
    print("📊 生成 g04 亂數比賽資料...")
    game_data = generate_random_game_data()
    
    # 生成選手統計
    print("📈 計算選手統計資料...")
    player_stats = generate_player_statistics(game_data)
    
    # 顯示統計結果
    print("\n📋 選手統計結果：")
    print(f"客場隊伍 ({game_data['awayTeam']})：")
    for player in player_stats['away']:
        print(f"  {player['name']}: 01({player['o1Games']}/{player['o1Wins']}) CR({player['crGames']}/{player['crWins']}) 總計({player['totalGames']}/{player['totalWins']}) 先攻({player['firstAttacks']})")
    
    print(f"\n主場隊伍 ({game_data['homeTeam']})：")
    for player in player_stats['home']:
        print(f"  {player['name']}: 01({player['o1Games']}/{player['o1Wins']}) CR({player['crGames']}/{player['crWins']}) 總計({player['totalGames']}/{player['totalWins']}) 先攻({player['firstAttacks']})")
    
    # 生成 HTML 內容
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <link rel="stylesheet" href="../../styles/common/game_result.css">
</head>
<body>
    <div class="container">
        <!-- 比賽資訊區 -->
        <div class="match-info">
            <h2 class="match-date">{game_data['gameDate']}</h2>
            <div class="venue-info">{game_data['venue']}</div>
            <div class="match-result">
                <div class="team away">
                    <div class="team-name">{game_data['awayTeam']}</div>
                    <div class="team-score">{game_data['scores']['away']['total']}</div>
                </div>
                <div class="score-divider">:</div>
                <div class="team home">
                    <div class="team-score">{game_data['scores']['home']['total']}</div>
                    <div class="team-name">{game_data['homeTeam']}</div>
                </div>
            </div>
        </div>

<div class="games-container">
    <!-- 個人賽 01 -->
    <div class="game-section">
        <h3>個人賽 01</h3><h4>(黃底為先攻場次)</h4>
        <table class="game-table">
            <tr>
                <th>賽局</th>
                <th>客隊</th>
                <th>主隊</th>
            </tr>"""

    # 添加 SET1-5 的 01 比賽
    for i in range(1, 6):
        set_data = game_data['sets'][i-1]
        away_players = ', '.join(set_data['awayPlayers'])
        home_players = ', '.join(set_data['homePlayers'])
        
        away_class = ""
        home_class = ""
        if set_data['firstAttack'] == 'away':
            away_class = "first-attack"
        if set_data['firstAttack'] == 'home':
            home_class = "first-attack"
        if set_data['winner'] == 'away':
            away_class += " winner"
        if set_data['winner'] == 'home':
            home_class += " winner"
        
        html_content += f"""
            <tr>
                <td class="game-type">SET{i}<br><span class="game-detail">501 (OI/MO)</span></td>
                <td class="{away_class}">{away_players}</td>
                <td class="{home_class}">{home_players}</td>
            </tr>"""

    html_content += """
        </table>
    </div>

    <!-- Cricket 賽局 -->
    <div class="game-section">
        <h3>Cricket Games</h3>
        <table class="game-table">
            <tr>
                <th>賽局</th>
                <th>客隊</th>
                <th>主隊</th>
            </tr>"""

    # 添加 SET6-10 的 Cricket 比賽
    for i in range(6, 11):
        set_data = game_data['sets'][i-1]
        away_players = ', '.join(set_data['awayPlayers'])
        home_players = ', '.join(set_data['homePlayers'])
        
        away_class = ""
        home_class = ""
        if set_data['firstAttack'] == 'away':
            away_class = "first-attack"
        if set_data['firstAttack'] == 'home':
            home_class = "first-attack"
        if set_data['winner'] == 'away':
            away_class += " winner"
        if set_data['winner'] == 'home':
            home_class += " winner"
        
        html_content += f"""
            <tr>
                <td class="game-type">SET{i}<br><span class="game-detail">Cricket</span></td>
                <td class="{away_class}">{away_players}</td>
                <td class="{home_class}">{home_players}</td>
            </tr>"""

    html_content += """
        </table>
    </div>

    <!-- 雙人賽 -->
    <div class="game-section">
        <h3>雙人賽</h3>
        <table class="game-table">
            <tr>
                <th>賽局</th>
                <th>客隊</th>
                <th>主隊</th>
            </tr>"""

    # 添加 SET11-14 的雙人賽
    for i in range(11, 15):
        set_data = game_data['sets'][i-1]
        away_players = ', '.join(set_data['awayPlayers'])
        home_players = ', '.join(set_data['homePlayers'])
        
        away_class = ""
        home_class = ""
        if set_data['firstAttack'] == 'away':
            away_class = "first-attack"
        if set_data['firstAttack'] == 'home':
            home_class = "first-attack"
        if set_data['winner'] == 'away':
            away_class += " winner"
        if set_data['winner'] == 'home':
            home_class += " winner"
        
        html_content += f"""
            <tr>
                <td class="game-type">SET{i}<br><span class="game-detail">701 雙人賽</span></td>
                <td class="{away_class}">{away_players}</td>
                <td class="{home_class}">{home_players}</td>
            </tr>"""

    html_content += """
        </table>
    </div>

    <!-- 四人賽 -->
    <div class="game-section">
        <h3>四人賽</h3>
        <table class="game-table">
            <tr>
                <th>賽局</th>
                <th>客隊</th>
                <th>主隊</th>
            </tr>"""

    # 添加 SET15-16 的四人賽
    for i in range(15, 17):
        set_data = game_data['sets'][i-1]
        away_players = ', '.join(set_data['awayPlayers'])
        home_players = ', '.join(set_data['homePlayers'])
        
        away_class = ""
        home_class = ""
        if set_data['firstAttack'] == 'away':
            away_class = "first-attack"
        if set_data['firstAttack'] == 'home':
            home_class = "first-attack"
        if set_data['winner'] == 'away':
            away_class += " winner"
        if set_data['winner'] == 'home':
            home_class += " winner"
        
        html_content += f"""
            <tr>
                <td class="game-type">SET{i}<br><span class="game-detail">四人賽 Cricket</span></td>
                <td class="{away_class}">{away_players}</td>
                <td class="{home_class}">{home_players}</td>
            </tr>"""

    html_content += """
        </table>
    </div>

    <!-- 選手統計 -->
    <div class="game-section">
        <h3>選手統計</h3>
        <div class="stats-buttons">
            <button class="stats-btn active" data-team="away">客場選手</button>
            <button class="stats-btn" data-team="home">主場選手</button>
        </div>
        
        <!-- 客場選手統計 -->
        <table class="game-table stats-table" id="awayStats">
            <tr>
                <th class="player-name">選手</th>
                <th class="stat-cell">01出賽</th>
                <th class="stat-cell">01勝場</th>
                <th class="stat-cell">CR出賽</th>
                <th class="stat-cell">CR勝場</th>
                <th class="stat-cell">合計出賽</th>
                <th class="stat-cell">合計勝場</th>
                <th class="stat-cell">先攻數</th>
            </tr>"""

    # 添加客場選手統計
    for player in player_stats['away']:
        html_content += f"""
            <tr>
                <td class="player-name">{player['name']}</td>
                <td class="stat-cell">{player['o1Games']}</td>
                <td class="stat-cell">{player['o1Wins']}</td>
                <td class="stat-cell">{player['crGames']}</td>
                <td class="stat-cell">{player['crWins']}</td>
                <td class="stat-cell">{player['totalGames']}</td>
                <td class="stat-cell">{player['totalWins']}</td>
                <td class="stat-cell">{player['firstAttacks']}</td>
            </tr>"""

    html_content += """
        </table>

        <!-- 主場選手統計 -->
        <table class="game-table stats-table hidden" id="homeStats">
            <tr>
                <th class="player-name">選手</th>
                <th class="stat-cell">01出賽</th>
                <th class="stat-cell">01勝場</th>
                <th class="stat-cell">CR出賽</th>
                <th class="stat-cell">CR勝場</th>
                <th class="stat-cell">合計出賽</th>
                <th class="stat-cell">合計勝場</th>
                <th class="stat-cell">先攻數</th>
            </tr>"""

    # 添加主場選手統計
    for player in player_stats['home']:
        html_content += f"""
            <tr>
                <td class="player-name">{player['name']}</td>
                <td class="stat-cell">{player['o1Games']}</td>
                <td class="stat-cell">{player['o1Wins']}</td>
                <td class="stat-cell">{player['crGames']}</td>
                <td class="stat-cell">{player['crWins']}</td>
                <td class="stat-cell">{player['totalGames']}</td>
                <td class="stat-cell">{player['totalWins']}</td>
                <td class="stat-cell">{player['firstAttacks']}</td>
            </tr>"""

    html_content += """
        </table>
    </div>
</div> 
</div> 

<!-- 引入 JavaScript -->
<script src="../../js/game_result.js"></script>
<script>
// 添加本場比賽資料
const g04Matches = ["""

    # 添加比賽資料
    for i, set_data in enumerate(game_data['sets'], 1):
        away_players = set_data['awayPlayers']
        home_players = set_data['homePlayers']
        
        # 判斷比賽類型
        if 6 <= i <= 10:
            game_type = 'CR'
        else:
            game_type = '01'
        
        # 格式化選手資料
        away_str = f"['{away_players[0]}','{away_players[1]}']" if len(away_players) > 1 else f"'{away_players[0]}'"
        home_str = f"['{home_players[0]}','{home_players[1]}']" if len(home_players) > 1 else f"'{home_players[0]}'"
        
        if len(away_players) > 2:
            away_str = f"['{away_players[0]}','{away_players[1]}','{away_players[2]}','{away_players[3]}']"
        if len(home_players) > 2:
            home_str = f"['{home_players[0]}','{home_players[1]}','{home_players[2]}','{home_players[3]}']"
        
        html_content += f"""
    {{set: {i}, type: '{game_type}', away: {away_str}, home: {home_str}, firstAttack: '{set_data['firstAttack']}', winner: '{set_data['winner']}'}},"""

    html_content += f"""
];

// 設定飲酒加成
const drinkingBonus = {{
    away: {game_data['drinkingBonus']['away']},
    home: {game_data['drinkingBonus']['home']}
}};

// 定義本場比賽的選手名單
const awayPlayers = {player_stats['away']};
const homePlayers = {player_stats['home']};

// 初始化本場比賽
addMatchData(g04Matches);
const scores = calculateFinalScore(g04Matches, drinkingBonus);
updateScoreDisplay(scores);
initializeStats(awayPlayers, homePlayers);
</script>

</body>
</html>"""
    
    # 準備發送到 Google Apps Script 的資料
    timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
    sheets_data = {
        **game_data,
        'htmlContent': html_content,
        'playerStats': player_stats,
        'htmlSheetName': f'g04_{timestamp}',
        'statsSheetName': f'result_{timestamp}',
        'timestamp': datetime.now().isoformat()
    }
    
    print(f"\n📤 發送資料到 Google Apps Script...")
    print(f"HTML 工作表：g04_{timestamp}")
    print(f"統計工作表：result_{timestamp}")
    
    try:
        response = requests.post(
            SCRIPT_URL,
            data=json.dumps(sheets_data),
            headers={'Content-Type': 'text/plain'},
            timeout=30
        )
        
        print(f"POST 請求狀態: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 測試成功！")
            print(f"   狀態: {result.get('status')}")
            print(f"   遊戲 ID: {result.get('gameId')}")
            print(f"   HTML 工作表: {result.get('htmlSheetName')}")
            print(f"   統計工作表: {result.get('statsSheetName')}")
            
            print(f"\n🎯 請檢查 Google Sheets 中的以下工作表：")
            print(f"   - HTML 工作表：{result.get('htmlSheetName')}")
            print(f"   - 統計工作表：{result.get('statsSheetName')}")
            
            return True
        else:
            print(f"❌ 請求失敗：{response.status_code}")
            print(f"回應內容：{response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 請求錯誤：{e}")
        return False

def main():
    """主函數"""
    success = test_g04_player_stats()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ g04 選手統計測試成功！")
        print("✅ HTML 和統計工作表已建立")
        print("✅ 請檢查 Google Sheets 中的結果")
    else:
        print("❌ g04 選手統計測試失敗")
        print("   請檢查 Google Apps Script 設定")

if __name__ == "__main__":
    main()
