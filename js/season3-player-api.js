/**
 * Season 3 選手表現數據 API
 * 包含每位選手在SET 1-16的詳細統計
 * 更新日期：2024-12-26
 */

class Season3PlayerAPI {
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
            const response = await fetch('./firebase_data/season3_player_performance.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to load Season 3 player data:', error);
            throw error;
        }
    }

    /**
     * 獲取所有選手列表（按出賽次數排序）
     */
    async getAllPlayers() {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        const playerList = Object.values(players);
        
        return playerList.sort((a, b) => b.total_sets_played - a.total_sets_played);
    }

    /**
     * 獲取指定選手詳細資料
     */
    async getPlayerDetails(playerName) {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        return players[playerName] || null;
    }

    /**
     * 獲取隊伍所有選手
     */
    async getTeamPlayers(teamName) {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        const teamPlayers = [];
        
        for (const [name, data] of Object.entries(players)) {
            if (data.teams.includes(teamName)) {
                teamPlayers.push(data);
            }
        }
        
        return teamPlayers.sort((a, b) => b.total_sets_played - a.total_sets_played);
    }

    /**
     * 獲取指定SET的最佳表現選手
     */
    async getTopPlayersInSet(setNumber, minGames = 5) {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        const setPlayers = [];
        
        for (const [name, data] of Object.entries(players)) {
            const setData = data.set_details[setNumber.toString()];
            if (setData && setData.played >= minGames) {
                setPlayers.push({
                    name: name,
                    teams: data.teams,
                    played: setData.played,
                    won: setData.won,
                    win_rate: setData.win_rate
                });
            }
        }
        
        return setPlayers.sort((a, b) => b.win_rate - a.win_rate).slice(0, 10);
    }

    /**
     * 獲取總勝率最高的選手
     */
    async getTopPlayersByWinRate(minGames = 20) {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        const topPlayers = [];
        
        for (const [name, data] of Object.entries(players)) {
            if (data.total_sets_played >= minGames) {
                topPlayers.push({
                    name: name,
                    teams: data.teams,
                    total_sets_played: data.total_sets_played,
                    total_sets_won: data.total_sets_won,
                    total_win_rate: data.total_win_rate
                });
            }
        }
        
        return topPlayers.sort((a, b) => b.total_win_rate - a.total_win_rate);
    }

    /**
     * 獲取最活躍的選手（出賽次數最多）
     */
    async getMostActiveePlayers(limit = 20) {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        const activePlayers = Object.values(players);
        
        return activePlayers
            .sort((a, b) => b.total_sets_played - a.total_sets_played)
            .slice(0, limit);
    }

    /**
     * 搜尋選手（模糊匹配）
     */
    async searchPlayers(searchTerm) {
        await this.init();
        
        const players = this.data.season3_player_performance.players;
        const results = [];
        
        for (const [name, data] of Object.entries(players)) {
            if (name.includes(searchTerm)) {
                results.push(data);
            }
        }
        
        return results.sort((a, b) => b.total_sets_played - a.total_sets_played);
    }

    /**
     * 獲取選手在各SET的表現分析
     */
    async getPlayerSetAnalysis(playerName) {
        await this.init();
        
        const player = await this.getPlayerDetails(playerName);
        if (!player) return null;
        
        const setAnalysis = [];
        for (let i = 1; i <= 16; i++) {
            const setData = player.set_details[i.toString()];
            setAnalysis.push({
                set: i,
                played: setData.played,
                won: setData.won,
                win_rate: setData.win_rate,
                performance_level: this.getPerformanceLevel(setData.win_rate, setData.played)
            });
        }
        
        return {
            player_name: playerName,
            teams: player.teams,
            total_stats: {
                total_sets_played: player.total_sets_played,
                total_sets_won: player.total_sets_won,
                total_win_rate: player.total_win_rate
            },
            set_analysis: setAnalysis,
            best_sets: setAnalysis.filter(s => s.played >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 3),
            worst_sets: setAnalysis.filter(s => s.played >= 3).sort((a, b) => a.win_rate - b.win_rate).slice(0, 3)
        };
    }

    /**
     * 根據勝率和出賽次數判定表現等級
     */
    getPerformanceLevel(winRate, played) {
        if (played < 3) return 'insufficient_data';
        if (winRate >= 80) return 'excellent';
        if (winRate >= 65) return 'good';
        if (winRate >= 50) return 'average';
        if (winRate >= 35) return 'below_average';
        return 'poor';
    }

    /**
     * 獲取統計摘要
     */
    async getStatsSummary() {
        await this.init();
        
        const data = this.data.season3_player_performance;
        return {
            total_players: data.total_players,
            analysis_scope: data.analysis_scope,
            last_updated: data.last_updated
        };
    }

    /**
     * 獲取SET得分配置
     */
    getSetScoreConfig() {
        return [1, 1, 1, 1, 3, 1, 1, 1, 1, 3, 2, 2, 2, 2, 4, 4];
    }

    /**
     * 獲取SET類型說明
     */
    getSetTypeInfo() {
        return {
            'SET 1-4': '個人賽 501 (1分)',
            'SET 5': '三人賽 501 (3分)',
            'SET 6-9': '個人賽 Cricket (1分)',
            'SET 10': '三人賽 Cricket (3分)',
            'SET 11-14': '雙人賽 (2分)',
            'SET 15': '四人賽 501 (4分)',
            'SET 16': '四人賽 Cricket (4分)'
        };
    }
}

// 創建全域API實例
const season3PlayerAPI = new Season3PlayerAPI();

// 便利函數
async function getSeason3PlayerDetails(playerName) {
    return await season3PlayerAPI.getPlayerDetails(playerName);
}

async function getSeason3TeamPlayers(teamName) {
    return await season3PlayerAPI.getTeamPlayers(teamName);
}

async function getSeason3TopPlayers(minGames = 20) {
    return await season3PlayerAPI.getTopPlayersByWinRate(minGames);
}

async function getSeason3PlayerSetAnalysis(playerName) {
    return await season3PlayerAPI.getPlayerSetAnalysis(playerName);
}

async function searchSeason3Players(searchTerm) {
    return await season3PlayerAPI.searchPlayers(searchTerm);
} 