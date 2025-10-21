-- BigQuery 分析查詢範例
-- 用於分析第五屆飛鏢聯賽資料

-- 1. 查看所有賽程資料
SELECT 
    game_id,
    game_date,
    away_team,
    away_score,
    home_team,
    home_score,
    venue,
    winner,
    created_at
FROM `your-project-id.darts_league.schedule`
WHERE season = 'S5'
ORDER BY game_date, game_id;

-- 2. 隊伍戰績統計
SELECT 
    team_name,
    COUNT(*) as total_games,
    SUM(CASE WHEN winner = team_name THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN loser = team_name THEN 1 ELSE 0 END) as losses,
    SUM(CASE WHEN winner IS NULL AND loser IS NULL THEN 1 ELSE 0 END) as draws,
    ROUND(
        SUM(CASE WHEN winner = team_name THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        2
    ) as win_percentage
FROM (
    SELECT away_team as team_name, winner, loser FROM `your-project-id.darts_league.schedule`
    UNION ALL
    SELECT home_team as team_name, winner, loser FROM `your-project-id.darts_league.schedule`
) team_games
WHERE team_name IS NOT NULL
GROUP BY team_name
ORDER BY wins DESC, win_percentage DESC;

-- 3. 每日比賽統計
SELECT 
    DATE(game_date) as match_date,
    COUNT(*) as games_played,
    STRING_AGG(CONCAT(away_team, ' vs ', home_team), ', ') as matchups
FROM `your-project-id.darts_league.schedule`
WHERE game_date IS NOT NULL
GROUP BY DATE(game_date)
ORDER BY match_date;

-- 4. 場地統計
SELECT 
    venue,
    COUNT(*) as games_hosted,
    COUNT(DISTINCT away_team) + COUNT(DISTINCT home_team) as unique_teams
FROM `your-project-id.darts_league.schedule`
WHERE venue IS NOT NULL
GROUP BY venue
ORDER BY games_hosted DESC;

-- 5. 高分比賽 (總分超過 40 分)
SELECT 
    game_id,
    game_date,
    away_team,
    away_score,
    home_team,
    home_score,
    (away_score + home_score) as total_score,
    venue
FROM `your-project-id.darts_league.schedule`
WHERE (away_score + home_score) > 40
ORDER BY total_score DESC;

-- 6. 隊伍主客場戰績
SELECT 
    team_name,
    SUM(CASE WHEN is_home THEN 1 ELSE 0 END) as home_games,
    SUM(CASE WHEN is_home AND winner = team_name THEN 1 ELSE 0 END) as home_wins,
    SUM(CASE WHEN NOT is_home THEN 1 ELSE 0 END) as away_games,
    SUM(CASE WHEN NOT is_home AND winner = team_name THEN 1 ELSE 0 END) as away_wins,
    ROUND(
        SUM(CASE WHEN is_home AND winner = team_name THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(SUM(CASE WHEN is_home THEN 1 ELSE 0 END), 0), 
        2
    ) as home_win_rate,
    ROUND(
        SUM(CASE WHEN NOT is_home AND winner = team_name THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(SUM(CASE WHEN NOT is_home THEN 1 ELSE 0 END), 0), 
        2
    ) as away_win_rate
FROM (
    SELECT away_team as team_name, winner, FALSE as is_home FROM `your-project-id.darts_league.schedule`
    UNION ALL
    SELECT home_team as team_name, winner, TRUE as is_home FROM `your-project-id.darts_league.schedule`
) team_games
WHERE team_name IS NOT NULL
GROUP BY team_name
ORDER BY (home_wins + away_wins) DESC;

-- 7. 月度比賽趨勢
SELECT 
    EXTRACT(YEAR FROM game_date) as year,
    EXTRACT(MONTH FROM game_date) as month,
    COUNT(*) as games_played,
    AVG(away_score + home_score) as avg_total_score
FROM `your-project-id.darts_league.schedule`
WHERE game_date IS NOT NULL
GROUP BY year, month
ORDER BY year, month;

-- 8. 飲酒加成分析 (如果有相關資料)
SELECT 
    drinking_team,
    COUNT(*) as drinking_games,
    SUM(CASE WHEN winner = drinking_team THEN 1 ELSE 0 END) as drinking_wins,
    ROUND(
        SUM(CASE WHEN winner = drinking_team THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 
        2
    ) as drinking_win_rate
FROM `your-project-id.darts_league.schedule`
WHERE drinking_team IS NOT NULL
GROUP BY drinking_team
ORDER BY drinking_win_rate DESC;
