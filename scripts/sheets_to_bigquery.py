#!/usr/bin/env python3
"""
Google Sheets 到 BigQuery 資料匯入腳本
用於將第五屆飛鏢聯賽資料匯入 BigQuery 進行分析
"""

import pandas as pd
import json
from google.cloud import bigquery
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
from datetime import datetime
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SheetsToBigQuery:
    def __init__(self, credentials_path=None, project_id=None):
        """
        初始化 BigQuery 和 Google Sheets API 客戶端
        
        Args:
            credentials_path: Google Cloud 服務帳戶金鑰檔案路徑
            project_id: Google Cloud 專案 ID
        """
        self.project_id = project_id or os.getenv('GOOGLE_CLOUD_PROJECT')
        self.credentials_path = credentials_path or os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        
        if not self.project_id:
            raise ValueError("請設定 GOOGLE_CLOUD_PROJECT 環境變數或傳入 project_id")
        
        # 初始化 BigQuery 客戶端
        if self.credentials_path:
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=['https://www.googleapis.com/auth/bigquery',
                       'https://www.googleapis.com/auth/spreadsheets.readonly']
            )
            self.bq_client = bigquery.Client(credentials=credentials, project=self.project_id)
            self.sheets_service = build('sheets', 'v4', credentials=credentials)
        else:
            # 使用預設認證
            self.bq_client = bigquery.Client(project=self.project_id)
            self.sheets_service = build('sheets', 'v4')
        
        logger.info(f"已連接到 BigQuery 專案: {self.project_id}")
    
    def get_sheets_data(self, sheet_id, range_name):
        """
        從 Google Sheets 取得資料
        
        Args:
            sheet_id: Google Sheets 檔案 ID
            range_name: 資料範圍 (例如: 'schedule!A:AE')
        
        Returns:
            pandas.DataFrame: 取得的資料
        """
        try:
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=sheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            if not values:
                logger.warning(f"在範圍 {range_name} 中沒有找到資料")
                return pd.DataFrame()
            
            # 轉換為 DataFrame
            df = pd.DataFrame(values[1:], columns=values[0])
            logger.info(f"成功取得 {len(df)} 筆資料")
            return df
            
        except Exception as e:
            logger.error(f"取得 Google Sheets 資料時發生錯誤: {e}")
            raise
    
    def clean_schedule_data(self, df):
        """
        清理賽程資料
        
        Args:
            df: 原始賽程資料 DataFrame
        
        Returns:
            pandas.DataFrame: 清理後的資料
        """
        logger.info("開始清理賽程資料...")
        
        # 移除空行
        df = df.dropna(how='all')
        
        # 重新命名欄位為英文
        column_mapping = {
            '遊戲編號': 'game_id',
            '日期': 'game_date',
            '客場隊伍': 'away_team',
            '客場分數': 'away_score',
            '主場分數': 'home_score',
            '主場隊伍': 'home_team',
            '比賽地點': 'venue',
            '勝': 'winner',
            '敗': 'loser',
            '酒': 'drinking_team',
            '和局': 'draw_team',
            '和局.1': 'draw_team_alt'
        }
        
        # 只保留有對應的欄位
        available_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
        df = df.rename(columns=available_columns)
        
        # 清理分數資料
        if 'away_score' in df.columns:
            df['away_score'] = pd.to_numeric(df['away_score'], errors='coerce')
        if 'home_score' in df.columns:
            df['home_score'] = pd.to_numeric(df['home_score'], errors='coerce')
        
        # 清理日期格式
        if 'game_date' in df.columns:
            df['game_date'] = pd.to_datetime(df['game_date'], errors='coerce')
        
        # 移除無效的遊戲記錄（沒有遊戲編號的）
        if 'game_id' in df.columns:
            df = df[df['game_id'].notna() & (df['game_id'] != '')]
        
        logger.info(f"清理完成，保留 {len(df)} 筆有效記錄")
        return df
    
    def clean_ranking_data(self, df):
        """
        清理排名資料
        
        Args:
            df: 原始排名資料 DataFrame
        
        Returns:
            pandas.DataFrame: 清理後的資料
        """
        logger.info("開始清理排名資料...")
        
        # 移除空行
        df = df.dropna(how='all')
        
        # 重新命名欄位
        column_mapping = {
            '排名': 'rank',
            '隊伍': 'team_name',
            '勝': 'wins',
            '敗': 'losses',
            '和': 'draws',
            '積分': 'points',
            '飲酒加成': 'drinking_bonus',
            '總分': 'total_score'
        }
        
        available_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
        df = df.rename(columns=available_columns)
        
        # 轉換數值欄位
        numeric_columns = ['rank', 'wins', 'losses', 'draws', 'points', 'drinking_bonus', 'total_score']
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # 移除無效記錄
        df = df[df['team_name'].notna() & (df['team_name'] != '')]
        
        logger.info(f"排名資料清理完成，保留 {len(df)} 筆記錄")
        return df
    
    def create_bigquery_tables(self, dataset_id='darts_league'):
        """
        在 BigQuery 中建立資料集和表格
        
        Args:
            dataset_id: 資料集 ID
        """
        logger.info(f"建立 BigQuery 資料集: {dataset_id}")
        
        # 建立資料集
        dataset_ref = self.bq_client.dataset(dataset_id)
        try:
            dataset = self.bq_client.get_dataset(dataset_ref)
            logger.info(f"資料集 {dataset_id} 已存在")
        except Exception:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = "US"
            dataset = self.bq_client.create_dataset(dataset, timeout=30)
            logger.info(f"已建立資料集: {dataset_id}")
        
        # 定義表格結構
        tables_schema = {
            'schedule': [
                bigquery.SchemaField("game_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("game_date", "DATE"),
                bigquery.SchemaField("away_team", "STRING"),
                bigquery.SchemaField("away_score", "INTEGER"),
                bigquery.SchemaField("home_score", "INTEGER"),
                bigquery.SchemaField("home_team", "STRING"),
                bigquery.SchemaField("venue", "STRING"),
                bigquery.SchemaField("winner", "STRING"),
                bigquery.SchemaField("loser", "STRING"),
                bigquery.SchemaField("drinking_team", "STRING"),
                bigquery.SchemaField("draw_team", "STRING"),
                bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED")
            ],
            'team_rankings': [
                bigquery.SchemaField("rank", "INTEGER", mode="REQUIRED"),
                bigquery.SchemaField("team_name", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("wins", "INTEGER"),
                bigquery.SchemaField("losses", "INTEGER"),
                bigquery.SchemaField("draws", "INTEGER"),
                bigquery.SchemaField("points", "INTEGER"),
                bigquery.SchemaField("drinking_bonus", "INTEGER"),
                bigquery.SchemaField("total_score", "INTEGER"),
                bigquery.SchemaField("season", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED")
            ]
        }
        
        # 建立表格
        for table_name, schema in tables_schema.items():
            table_ref = dataset_ref.table(table_name)
            try:
                table = self.bq_client.get_table(table_ref)
                logger.info(f"表格 {table_name} 已存在")
            except Exception:
                table = bigquery.Table(table_ref, schema=schema)
                table = self.bq_client.create_table(table)
                logger.info(f"已建立表格: {table_name}")
    
    def upload_to_bigquery(self, df, table_name, dataset_id='darts_league', 
                          season='S5', write_mode='WRITE_TRUNCATE'):
        """
        上傳資料到 BigQuery
        
        Args:
            df: 要上傳的 DataFrame
            table_name: 目標表格名稱
            dataset_id: 資料集 ID
            season: 賽季
            write_mode: 寫入模式 ('WRITE_TRUNCATE', 'WRITE_APPEND', 'WRITE_EMPTY')
        """
        if df.empty:
            logger.warning("沒有資料可上傳")
            return
        
        # 添加時間戳記和賽季資訊
        current_time = datetime.now()
        df['created_at'] = current_time
        
        if table_name == 'team_rankings':
            df['season'] = season
        
        # 準備上傳
        table_ref = self.bq_client.dataset(dataset_id).table(table_name)
        
        job_config = bigquery.LoadJobConfig(
            write_disposition=write_mode,
            schema_update_options=[
                bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION,
                bigquery.SchemaUpdateOption.ALLOW_FIELD_RELAXATION
            ]
        )
        
        try:
            job = self.bq_client.load_table_from_dataframe(df, table_ref, job_config=job_config)
            job.result()  # 等待作業完成
            
            logger.info(f"成功上傳 {len(df)} 筆記錄到 {dataset_id}.{table_name}")
            
            # 顯示表格資訊
            table = self.bq_client.get_table(table_ref)
            logger.info(f"表格 {table_name} 現在有 {table.num_rows} 筆記錄")
            
        except Exception as e:
            logger.error(f"上傳到 BigQuery 時發生錯誤: {e}")
            raise
    
    def run_import(self, sheet_id, project_id=None):
        """
        執行完整的匯入流程
        
        Args:
            sheet_id: Google Sheets 檔案 ID
            project_id: Google Cloud 專案 ID
        """
        if project_id:
            self.project_id = project_id
        
        logger.info("開始執行 Google Sheets 到 BigQuery 匯入流程")
        
        try:
            # 1. 建立 BigQuery 表格
            self.create_bigquery_tables()
            
            # 2. 取得賽程資料
            logger.info("取得賽程資料...")
            schedule_df = self.get_sheets_data(sheet_id, 'schedule!A:L')
            if not schedule_df.empty:
                schedule_df = self.clean_schedule_data(schedule_df)
                self.upload_to_bigquery(schedule_df, 'schedule', season='S5')
            
            # 3. 取得排名資料
            logger.info("取得排名資料...")
            ranking_df = self.get_sheets_data(sheet_id, 'schedule!O:V')
            if not ranking_df.empty:
                ranking_df = self.clean_ranking_data(ranking_df)
                self.upload_to_bigquery(ranking_df, 'team_rankings', season='S5')
            
            logger.info("匯入流程完成！")
            
        except Exception as e:
            logger.error(f"匯入流程失敗: {e}")
            raise

def main():
    """主程式"""
    # 設定參數
    SHEET_ID = '1xb6UmcQ4ueQcCn_dHW8JJ9H2Ya2Mp94HdJqz90BlEEY'  # 第五屆資料表
    PROJECT_ID = os.getenv('GOOGLE_CLOUD_PROJECT')  # 從環境變數取得
    
    if not PROJECT_ID:
        print("請設定 GOOGLE_CLOUD_PROJECT 環境變數")
        print("例如: export GOOGLE_CLOUD_PROJECT=your-project-id")
        return
    
    # 執行匯入
    importer = SheetsToBigQuery(project_id=PROJECT_ID)
    importer.run_import(SHEET_ID, PROJECT_ID)

if __name__ == "__main__":
    main()
