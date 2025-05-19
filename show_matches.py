import json

# 讀取數據
with open('schedule_data.json', 'r') as f:
    data = json.load(f)

# 檢查數據結構
if 'values' not in data:
    print('找不到 values 欄位')
    exit(1)

values = data['values']
print(f'數據有 {len(values)} 行')

# 解析比賽數據
matches = []
for i, row in enumerate(values):
    if i == 0:  # 跳過標題行
        continue
        
    if not row:  # 跳過空行
        continue
        
    if len(row) < 7:  # 確保有足夠的數據
        continue
        
    # 檢查是否為比賽行
    game_code = row[0] if len(row) > 0 else ''
    if not (game_code and isinstance(game_code, str) and game_code.startswith('G')):
        continue
        
    match_date = row[1] if len(row) > 1 else ''
    team1 = row[2] if len(row) > 2 else ''
    score1 = row[3] if len(row) > 3 else ''
    score2 = row[5] if len(row) > 5 else ''
    team2 = row[6] if len(row) > 6 else ''
    venue = row[7] if len(row) > 7 else ''
    
    # 添加到列表
    matches.append({
        'game_code': game_code,
        'date': match_date,
        'team1': team1,
        'score1': score1,
        'team2': team2,
        'score2': score2,
        'venue': venue
    })

# 打印結果
print(f'共解析出 {len(matches)} 場比賽')
print('='*50)
print('比賽細節:')
for match in matches[:20]:  # 只顯示前20場
    print(f'日期: {match["date"]}, 編號: {match["game_code"]}, 客場: {match["team1"]} {match["score1"] or "未知"}, 主場: {match["team2"]} {match["score2"] or "未知"}, 場地: {match["venue"]}') 