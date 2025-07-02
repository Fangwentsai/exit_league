/**
 * Season 3 完整統計數據 API
 * 包含正確的勝場加成和飲酒加成計算
 * 更新日期：2024-12-26
 */

class Season3API {
    constructor() {
        this.data = null;
        this.initialized = false;
    }

    /**
     * 初始化數據
     */
    async init() {
        if (this.initialized) return;
        
        try {
            const response = await fetch('./firebase_data/season3_complete_final.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to load Season 3 data:', error);
            throw error;
        }
    }

    /**
     * 獲取所有隊伍排名
     */
    async getTeamRankings() {
        await this.init();
        
        const teams = this.data.season3_complete_stats.teams;
        const rankings = Object.values(teams).sort((a, b) => b.final_score - a.final_score);
        
        return rankings.map((team, index) => ({
            rank: index + 1,
            name: team.name,
            wins: team.wins,
            losses: team.losses,
            draws: team.draws,
            set_points: team.set_points,
            win_bonus: team.win_bonus,
            drinking_bonus: team.drinking_bonus,
            final_score: team.final_score,
            win_rate: team.win_rate,
            matches_played: team.matches_played
        }));
    }

    /**
     * 獲取特定隊伍的詳細資料
     */
    async getTeamDetails(teamName) {
        await this.init();
        
        const team = this.data.season3_complete_stats.teams[teamName];
        if (!team) {
            throw new Error(`Team ${teamName} not found`);
        }
        
        return {
            ...team,
            matches: team.matches.map(match => ({
                ...match,
                game_number: parseInt(match.game.replace('g', '').replace('.html', '')),
                opponent_win_bonus: match.result === 'loss' ? 1 : (match.result === 'draw' ? 0 : 0),
                opponent_total: this.calculateOpponentTotal(match)
            }))
        };
    }

    /**
     * 計算對手總分
     */
    calculateOpponentTotal(match) {
        const opponentWinBonus = match.result === 'loss' ? 1 : (match.result === 'draw' ? 0 : 0);
        // 這裡簡化處理，實際對手飲酒加成需要從原始數據查找
        return match.opponent_set_points + opponentWinBonus;
    }

    /**
     * 獲取所有比賽記錄
     */
    async getAllMatches() {
        await this.init();
        
        return this.data.season3_complete_stats.all_matches.map(match => ({
            ...match,
            game_number: parseInt(match.file.replace('g', '').replace('.html', ''))
        })).sort((a, b) => a.game_number - b.game_number);
    }

    /**
     * 獲取特定比賽的詳細資料
     */
    async getMatchDetails(gameNumber) {
        await this.init();
        
        const fileName = `g${gameNumber.toString().padStart(2, '0')}.html`;
        const match = this.data.season3_complete_stats.all_matches.find(m => m.file === fileName);
        
        if (!match) {
            throw new Error(`Match ${fileName} not found`);
        }
        
        return {
            ...match,
            game_number: gameNumber,
            away_team_details: {
                set_points: match.away_set_points,
                win_bonus: match.away_win_bonus,
                drinking_bonus: match.away_drinking_bonus,
                total: match.away_total
            },
            home_team_details: {
                set_points: match.home_set_points,
                win_bonus: match.home_win_bonus,
                drinking_bonus: match.home_drinking_bonus,
                total: match.home_total
            }
        };
    }

    /**
     * 獲取統計摘要
     */
    async getStatsSummary() {
        await this.init();
        
        const stats = this.data.season3_complete_stats;
        const teams = Object.values(stats.teams);
        
        return {
            total_matches: stats.total_matches,
            total_teams: teams.length,
            total_wins: teams.reduce((sum, team) => sum + team.wins, 0),
            total_losses: teams.reduce((sum, team) => sum + team.losses, 0),
            total_draws: teams.reduce((sum, team) => sum + team.draws, 0),
            total_set_points: teams.reduce((sum, team) => sum + team.set_points, 0),
            total_win_bonus: teams.reduce((sum, team) => sum + team.win_bonus, 0),
            total_drinking_bonus: teams.reduce((sum, team) => sum + team.drinking_bonus, 0),
            scoring_rules: stats.scoring_rules,
            last_updated: stats.last_updated
        };
    }

    /**
     * 獲取隊伍對戰記錄
     */
    async getHeadToHead(team1, team2) {
        await this.init();
        
        const team1Data = this.data.season3_complete_stats.teams[team1];
        const team2Data = this.data.season3_complete_stats.teams[team2];
        
        if (!team1Data || !team2Data) {
            throw new Error(`One or both teams not found: ${team1}, ${team2}`);
        }
        
        const team1Matches = team1Data.matches.filter(m => m.opponent === team2);
        const team2Matches = team2Data.matches.filter(m => m.opponent === team1);
        
        return {
            team1: {
                name: team1,
                matches: team1Matches,
                wins: team1Matches.filter(m => m.result === 'win').length,
                losses: team1Matches.filter(m => m.result === 'loss').length,
                draws: team1Matches.filter(m => m.result === 'draw').length
            },
            team2: {
                name: team2,
                matches: team2Matches,
                wins: team2Matches.filter(m => m.result === 'win').length,
                losses: team2Matches.filter(m => m.result === 'loss').length,
                draws: team2Matches.filter(m => m.result === 'draw').length
            }
        };
    }
}

// 創建全局實例
const season3API = new Season3API();

// 導出常用函數到全局作用域
window.getSeason3Rankings = () => season3API.getTeamRankings();
window.getSeason3TeamDetails = (teamName) => season3API.getTeamDetails(teamName);
window.getSeason3AllMatches = () => season3API.getAllMatches();
window.getSeason3MatchDetails = (gameNumber) => season3API.getMatchDetails(gameNumber);
window.getSeason3StatsSummary = () => season3API.getStatsSummary();
window.getSeason3HeadToHead = (team1, team2) => season3API.getHeadToHead(team1, team2);

// 也導出類本身供高級使用
window.Season3API = Season3API;
window.season3API = season3API; 