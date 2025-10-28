#!/usr/bin/env python3
"""
Season 3 比賽資料解析器
解析 game_result/season3/ 目錄下的所有 HTML 檔案
生成兩個 JSON 檔案供 BigQuery 使用

輸出檔案：
1. season3_match_results.json - 每場比賽的總結果 (56筆)
2. season3_game_details.json - 每場比賽的詳細對戰記錄 (896筆)
"""

import os
import json
import re
from bs4 import BeautifulSoup
from datetime import datetime
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Season3Parser:
    def __init__(self, base_dir="../game_result/season3"):
        self.base_dir = base_dir
        self.match_results = []  # 比賽結果摘要
        self.game_details = []   # 詳細對戰記錄
        
    def parse_all_games(self):
        """解析所有比賽檔案"""
        logger.info("開始解析 Season 3 比賽資料...")
        
        # 檢查目錄是否存在
        if not os.path.exists(self.base_dir):
            logger.error(f"目錄不存在: {self.base_dir}")
            return False
        
        # 解析 g01 到 g56 (全部比賽)
        for i in range(1, 57):
            game_file = f"g{i:02d}.html"
            file_path = os.path.join(self.base_dir, game_file)
            
            if os.path.exists(file_path):
                logger.info(f"解析 {game_file}...")
                try:
                    self.parse_single_game(file_path, f"G{i:02d}")
                except Exception as e:
                    logger.error(f"解析 {game_file} 時發生錯誤: {e}")
            else:
                logger.warning(f"檔案不存在: {file_path}")
        
        logger.info(f"解析完成！比賽結果: {len(self.match_results)} 筆，詳細記錄: {len(self.game_details)} 筆")
        return True
    
    def parse_single_game(self, file_path, game_id):
        """解析單場比賽"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        
        # 解析比賽基本資訊
        match_info = self.extract_match_info(soup, game_id)
        if match_info:
            self.match_results.append(match_info)
        
        # 解析詳細對戰記錄
        game_records = self.extract_game_details(soup, game_id)
        self.game_details.extend(game_records)
    
    def extract_match_info(self, soup, game_id):
        """提取比賽總結資訊"""
        try:
            # 提取比賽日期
            match_date = self.extract_match_date(soup)
            
            # 提取隊伍資訊和各種得分
            away_team, home_team, scores = self.extract_teams_and_scores(soup)
            
            # 判斷勝負 (基於最終總分)
            if scores.get('away_final_score', 0) > scores.get('home_final_score', 0):
                winner, loser = away_team, home_team
            elif scores.get('home_final_score', 0) > scores.get('away_final_score', 0):
                winner, loser = home_team, away_team
            else:
                winner, loser = "平手", "平手"
            
            # 判斷加成歸屬
            victory_bonus_team = home_team if scores.get('home_victory_bonus', 0) > 0 else (away_team if scores.get('away_victory_bonus', 0) > 0 else "無")
            victory_bonus_amount = max(scores.get('home_victory_bonus', 0), scores.get('away_victory_bonus', 0))
            
            drinking_bonus_team = home_team if scores.get('home_drinking_bonus', 0) > 0 else (away_team if scores.get('away_drinking_bonus', 0) > 0 else "無")
            drinking_bonus_amount = max(scores.get('home_drinking_bonus', 0), scores.get('away_drinking_bonus', 0))
            
            match_info = {
                "game_id": game_id,
                "match_date": match_date,
                "away_team": away_team,
                "home_team": home_team,
                "away_team_score": scores.get('away_team_score', 0),      # 客隊比賽成績
                "home_team_score": scores.get('home_team_score', 0),      # 主隊比賽成績
                "away_team_final_score": scores.get('away_final_score', 0),  # 客隊最終總分
                "home_team_final_score": scores.get('home_final_score', 0),  # 主隊最終總分
                "winner": winner,
                "loser": loser,
                "victory_bonus_team": victory_bonus_team,
                "victory_bonus_amount": victory_bonus_amount,
                "drinking_bonus_team": drinking_bonus_team,
                "drinking_bonus_amount": drinking_bonus_amount,
                "created_at": datetime.now().isoformat()
            }
            
            return match_info
            
        except Exception as e:
            logger.error(f"提取比賽資訊時發生錯誤 ({game_id}): {e}")
            return None
    
    def extract_game_details(self, soup, game_id):
        """提取詳細對戰記錄"""
        game_records = []
        
        try:
            # 尋找比賽記錄表格
            tables = soup.find_all('table', class_='game-table')
            
            for table_index, table in enumerate(tables):
                # 判斷比賽類型
                game_section = table.find_parent('div', class_='game-section')
                game_type = "未知"
                if game_section:
                    section_title = game_section.find('h3')
                    if section_title:
                        title_text = section_title.get_text()
                        if '01' in title_text:
                            game_type = "01"
                        elif 'CR' in title_text:
                            game_type = "CR"
                
                rows = table.find_all('tr')[1:]  # 跳過標題行
                
                for row_index, row in enumerate(rows):
                    cells = row.find_all('td')
                    
                    if len(cells) >= 3:  # SET, 客隊, 主隊
                        record = self.parse_game_record_new(cells, game_id, table_index, row_index, game_type)
                        if record:
                            game_records.append(record)
            
        except Exception as e:
            logger.error(f"提取詳細記錄時發生錯誤 ({game_id}): {e}")
        
        return game_records
    
    def parse_game_record_new(self, cells, game_id, table_index, row_index, game_type):
        """解析新格式的對戰記錄"""
        try:
            if len(cells) < 3:
                return None
            
            # 提取 SET 資訊
            set_info = cells[0].get_text().strip()
            
            # 提取客隊選手
            away_cell = cells[1]
            away_player = away_cell.get_text().strip()
            away_is_winner = 'winner' in away_cell.get('class', [])
            away_first_attack = 'first-attack' in away_cell.get('class', [])
            
            # 提取主隊選手
            home_cell = cells[2]
            home_player = home_cell.get_text().strip()
            home_is_winner = 'winner' in home_cell.get('class', [])
            home_first_attack = 'first-attack' in home_cell.get('class', [])
            
            # 判斷勝者和先攻
            winner = "未知"
            if away_is_winner:
                winner = away_player
            elif home_is_winner:
                winner = home_player
            
            first_attack = "未知"
            if away_first_attack:
                first_attack = away_player
            elif home_first_attack:
                first_attack = home_player
            
            # 生成 set_id (純數字 1-16)
            set_number = table_index * 8 + row_index + 1  # 假設每個表格最多8局
            set_id = str(set_number)
            
            record = {
                "game_id": game_id,
                "set_id": set_id,
                "record_index": f"{table_index}_{row_index}",
                "set_info": set_info,
                "away_player": away_player,
                "home_player": home_player,
                "game_type": game_type,
                "first_attack_player": first_attack,
                "winner": winner,
                "away_is_winner": away_is_winner,
                "home_is_winner": home_is_winner,
                "created_at": datetime.now().isoformat()
            }
            
            return record
            
        except Exception as e:
            logger.error(f"解析對戰記錄時發生錯誤 ({game_id}): {e}")
            return None
    
    def parse_game_record(self, cells, game_id, record_index):
        """解析單筆對戰記錄"""
        try:
            # 提取文字內容
            cell_texts = [cell.get_text().strip() for cell in cells]
            
            # 跳過標題行
            if any(header in cell_texts[0].lower() for header in ['game', 'round', '局數', '選手']):
                return None
            
            # 基本記錄結構
            record = {
                "game_id": game_id,
                "record_index": record_index,
                "player1": cell_texts[0] if len(cell_texts) > 0 else "",
                "player2": cell_texts[1] if len(cell_texts) > 1 else "",
                "game_type": self.extract_game_type(cell_texts),
                "first_attack": self.extract_first_attack(cell_texts),
                "winner": self.extract_record_winner(cell_texts),
                "score": self.extract_score(cell_texts),
                "created_at": datetime.now().isoformat()
            }
            
            # 只返回有效記錄（有選手名稱）
            if record["player1"] or record["player2"]:
                return record
            
        except Exception as e:
            logger.error(f"解析對戰記錄時發生錯誤 ({game_id}-{record_index}): {e}")
        
        return None
    
    def parse_alternative_format(self, soup, game_id):
        """解析其他格式的比賽記錄"""
        records = []
        
        try:
            # 尋找可能包含比賽記錄的其他元素
            record_elements = soup.find_all(['div', 'p', 'span'], 
                                          class_=re.compile(r'game|match|record|player'))
            
            for i, elem in enumerate(record_elements):
                text = elem.get_text().strip()
                if text and len(text) > 5:  # 過濾太短的文字
                    # 嘗試從文字中提取資訊
                    record = self.parse_text_record(text, game_id, i + 1)
                    if record:
                        records.append(record)
        
        except Exception as e:
            logger.error(f"解析替代格式時發生錯誤 ({game_id}): {e}")
        
        return records
    
    def parse_text_record(self, text, game_id, record_index):
        """從文字中解析對戰記錄"""
        try:
            # 尋找選手名稱模式
            player_pattern = r'(\w+)\s*(?:vs|對|VS)\s*(\w+)'
            player_match = re.search(player_pattern, text)
            
            if player_match:
                return {
                    "game_id": game_id,
                    "record_index": record_index,
                    "player1": player_match.group(1),
                    "player2": player_match.group(2),
                    "game_type": "未知",
                    "first_attack": "未知",
                    "winner": "未知",
                    "score": "未知",
                    "raw_text": text,
                    "created_at": datetime.now().isoformat()
                }
        
        except Exception as e:
            logger.error(f"解析文字記錄時發生錯誤: {e}")
        
        return None
    
    def extract_teams_and_scores(self, soup):
        """提取隊伍名稱和各種得分"""
        try:
            # 尋找比賽結果區域
            match_result = soup.find('div', class_='match-result')
            if match_result:
                # 客隊 (away team)
                away_team_elem = match_result.find('div', class_='team away')
                away_team = away_team_elem.find('div', class_='team-name').get_text().strip() if away_team_elem else "未知隊伍1"
                
                # 主隊 (home team)
                home_team_elem = match_result.find('div', class_='team home')
                home_team = home_team_elem.find('div', class_='team-name').get_text().strip() if home_team_elem else "未知隊伍2"
                
                # 從詳細分數表格中提取各項得分
                scores = self.extract_detailed_scores(soup, away_team, home_team)
                
                return away_team, home_team, scores
            
            return "未知隊伍1", "未知隊伍2", {}
            
        except Exception as e:
            logger.error(f"提取隊伍資訊時發生錯誤: {e}")
            return "未知隊伍1", "未知隊伍2", {}
    
    def extract_detailed_scores(self, soup, away_team, home_team):
        """提取詳細分數資訊"""
        try:
            scores = {
                'away_team_score': 0,      # 客隊比賽成績 (獲勝局數)
                'home_team_score': 0,      # 主隊比賽成績 (獲勝局數)
                'away_victory_bonus': 0,   # 客隊勝場加成
                'home_victory_bonus': 0,   # 主隊勝場加成
                'away_drinking_bonus': 0,  # 客隊飲酒加成
                'home_drinking_bonus': 0,  # 主隊飲酒加成
                'away_final_score': 0,     # 客隊最終總分
                'home_final_score': 0      # 主隊最終總分
            }
            
            # 從 JavaScript 中提取比賽資料和飲酒加成
            js_scores = self.extract_from_javascript(soup)
            if js_scores:
                scores.update(js_scores)
                return scores
            
            # 備用方案：統計獲勝局數作為比賽成績
            away_wins, home_wins = self.count_team_wins(soup)
            scores['away_team_score'] = away_wins
            scores['home_team_score'] = home_wins
            
            return scores
            
        except Exception as e:
            logger.error(f"提取詳細分數時發生錯誤: {e}")
            return {}
    
    def extract_from_javascript(self, soup):
        """從 JavaScript 中提取比賽資料"""
        try:
            # 尋找 script 標籤
            scripts = soup.find_all('script')
            
            for script in scripts:
                script_content = script.string if script.string else ""
                
                # 提取比賽記錄
                if 'Matches = [' in script_content:
                    # 計算實際比分 (每局的分數)
                    away_score, home_score = self.calculate_actual_scores_from_js(script_content)
                    
                    # 提取飲酒加成
                    away_drinking, home_drinking = self.parse_drinking_bonus_from_js(script_content)
                    
                    # 計算勝場加成 (獲勝方得1分)
                    away_victory = 1 if away_score > home_score else 0
                    home_victory = 1 if home_score > away_score else 0
                    
                    # 計算最終總分
                    away_final = away_score + away_victory + away_drinking
                    home_final = home_score + home_victory + home_drinking
                    
                    return {
                        'away_team_score': away_score,      # 實際比分
                        'home_team_score': home_score,      # 實際比分
                        'away_victory_bonus': away_victory,
                        'home_victory_bonus': home_victory,
                        'away_drinking_bonus': away_drinking,
                        'home_drinking_bonus': home_drinking,
                        'away_final_score': away_final,
                        'home_final_score': home_final
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"從 JavaScript 提取資料時發生錯誤: {e}")
            return None
    
    def calculate_actual_scores_from_js(self, script_content):
        """從 JavaScript 中計算實際比分"""
        try:
            import re
            
            # 解析每局比賽的分數
            away_total_score = 0
            home_total_score = 0
            
            # 尋找比賽記錄陣列
            matches_pattern = r'\{set:\s*(\d+),.*?winner:\s*[\'"](\w+)[\'"].*?\}'
            matches = re.findall(matches_pattern, script_content, re.DOTALL)
            
            for set_num_str, winner in matches:
                set_num = int(set_num_str)
                
                # 根據 set 編號決定分數
                if set_num in [1,2,3,4,6,7,8,9]:
                    points = 1
                elif set_num in [11,12,13,14]:
                    points = 2
                elif set_num in [5,10]:
                    points = 3
                elif set_num in [15,16]:
                    points = 4
                else:
                    points = 1  # 預設 1 分
                
                # 根據勝者加分
                if winner == 'away':
                    away_total_score += points
                elif winner == 'home':
                    home_total_score += points
            
            return away_total_score, home_total_score
            
        except Exception as e:
            logger.error(f"計算實際比分時發生錯誤: {e}")
            # 備用方案：統計獲勝局數
            away_count = script_content.count("winner: 'away'")
            home_count = script_content.count("winner: 'home'")
            return away_count, home_count
    
    def parse_matches_from_js(self, script_content):
        """從 JavaScript 中解析比賽記錄 (獲勝局數)"""
        try:
            away_wins = 0
            home_wins = 0
            
            # 尋找所有 winner: 'away' 和 winner: 'home'
            away_count = script_content.count("winner: 'away'")
            home_count = script_content.count("winner: 'home'")
            
            return away_count, home_count
            
        except Exception as e:
            logger.error(f"解析比賽記錄時發生錯誤: {e}")
            return 0, 0
    
    def parse_drinking_bonus_from_js(self, script_content):
        """從 JavaScript 中解析飲酒加成"""
        try:
            away_drinking = 0
            home_drinking = 0
            
            # 尋找 drinkingBonus 物件
            if 'drinkingBonus = {' in script_content:
                # 提取 away 和 home 的值
                import re
                away_match = re.search(r'away:\s*(\d+)', script_content)
                home_match = re.search(r'home:\s*(\d+)', script_content)
                
                if away_match:
                    away_drinking = int(away_match.group(1))
                if home_match:
                    home_drinking = int(home_match.group(1))
            
            return away_drinking, home_drinking
            
        except Exception as e:
            logger.error(f"解析飲酒加成時發生錯誤: {e}")
            return 0, 0
    
    def determine_winner_loser(self, team1, team2, score1, score2):
        """判斷勝負"""
        try:
            if score1 > score2:
                return team1, team2
            elif score2 > score1:
                return team2, team1
            else:
                return "平手", "平手"
        except:
            return "未知", "未知"
    
    def count_team_wins(self, soup):
        """計算主客場獲勝場數"""
        try:
            tables = soup.find_all('table', class_='game-table')
            home_wins = 0
            away_wins = 0
            
            for table in tables:
                rows = table.find_all('tr')[1:]  # 跳過標題行
                
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 3:
                        # 客隊 (away)
                        away_cell = cells[1]
                        away_is_winner = 'winner' in away_cell.get('class', [])
                        
                        # 主隊 (home)
                        home_cell = cells[2]
                        home_is_winner = 'winner' in home_cell.get('class', [])
                        
                        if away_is_winner:
                            away_wins += 1
                        elif home_is_winner:
                            home_wins += 1
            
            return home_wins, away_wins
            
        except Exception as e:
            logger.error(f"計算獲勝場數時發生錯誤: {e}")
            return 0, 0
    
    def determine_drinking_team(self, soup, away_team, home_team, home_wins, away_wins):
        """判斷飲酒加成歸屬隊伍"""
        try:
            # 通常飲酒加成給輸的一方
            if home_wins > away_wins:
                return away_team  # 客隊輸了，給客隊飲酒加成
            elif away_wins > home_wins:
                return home_team  # 主隊輸了，給主隊飲酒加成
            else:
                return "平手"  # 平手時可能兩隊都有或都沒有
        except:
            return "未知"
    
    def extract_victory_bonus_with_team(self, soup, away_team, home_team, away_score, home_score):
        """提取勝場加成和歸屬隊伍"""
        try:
            # 勝場加成通常給獲勝的一方
            if away_score > home_score:
                return away_team, 3  # 假設勝場加成為3分
            elif home_score > away_score:
                return home_team, 3
            else:
                return "無", 0  # 平手時沒有勝場加成
        except:
            return "無", 0
    
    def extract_drinking_bonus_with_team(self, soup, away_team, home_team, away_score, home_score):
        """提取飲酒加成和歸屬隊伍"""
        try:
            # 飲酒加成通常給輸的一方，固定1分
            if away_score < home_score:
                return away_team, 1  # 客隊輸了，給客隊飲酒加成
            elif home_score < away_score:
                return home_team, 1  # 主隊輸了，給主隊飲酒加成
            else:
                return "無", 0  # 平手時沒有飲酒加成
        except:
            return "無", 0
    
    def extract_match_date(self, soup):
        """提取比賽日期"""
        try:
            # 尋找日期相關的文字
            date_elements = soup.find_all(text=re.compile(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}'))
            
            for date_text in date_elements:
                # 嘗試解析日期
                date_match = re.search(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2})', date_text)
                if date_match:
                    return date_match.group(1)
            
            return "未知日期"
        except:
            return "未知日期"
    
    def extract_game_type(self, cell_texts):
        """提取比賽類型 (01/CR)"""
        for text in cell_texts:
            if '01' in text:
                return '01'
            elif 'CR' in text.upper():
                return 'CR'
        return '未知'
    
    def extract_first_attack(self, cell_texts):
        """提取先攻資訊"""
        for text in cell_texts:
            if '先攻' in text or 'first' in text.lower():
                return '先攻'
            elif '後攻' in text or 'second' in text.lower():
                return '後攻'
        return '未知'
    
    def extract_record_winner(self, cell_texts):
        """提取單局勝者"""
        for text in cell_texts:
            if '勝' in text or 'win' in text.lower():
                return text
        return '未知'
    
    def extract_score(self, cell_texts):
        """提取比分"""
        for text in cell_texts:
            score_match = re.search(r'\d+[-:]\d+', text)
            if score_match:
                return score_match.group(0)
        return '未知'
    
    def save_to_json(self):
        """儲存為 JSON 檔案"""
        try:
            # 儲存比賽結果摘要
            results_file = 'season3_match_results.json'
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(self.match_results, f, ensure_ascii=False, indent=2)
            logger.info(f"比賽結果已儲存至: {results_file} ({len(self.match_results)} 筆)")
            
            # 儲存詳細對戰記錄
            details_file = 'season3_game_details.json'
            with open(details_file, 'w', encoding='utf-8') as f:
                json.dump(self.game_details, f, ensure_ascii=False, indent=2)
            logger.info(f"詳細記錄已儲存至: {details_file} ({len(self.game_details)} 筆)")
            
            # 生成統計報告
            self.generate_statistics()
            
        except Exception as e:
            logger.error(f"儲存檔案時發生錯誤: {e}")
    
    def generate_statistics(self):
        """生成統計報告"""
        stats = {
            "total_matches": len(self.match_results),
            "total_game_records": len(self.game_details),
            "matches_with_data": len([m for m in self.match_results if m["winner"] != "未知"]),
            "records_with_players": len([r for r in self.game_details if r["player1"] and r["player2"]]),
            "generated_at": datetime.now().isoformat()
        }
        
        with open('season3_statistics.json', 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info("=== 統計報告 ===")
        logger.info(f"總比賽場數: {stats['total_matches']}")
        logger.info(f"總對戰記錄: {stats['total_game_records']}")
        logger.info(f"有資料的比賽: {stats['matches_with_data']}")
        logger.info(f"有選手資料的記錄: {stats['records_with_players']}")

def main():
    """主程式"""
    parser = Season3Parser()
    
    if parser.parse_all_games():
        parser.save_to_json()
        logger.info("Season 3 資料解析完成！")
    else:
        logger.error("資料解析失敗！")

if __name__ == "__main__":
    main()
