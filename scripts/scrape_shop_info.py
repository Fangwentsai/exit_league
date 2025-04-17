import requests
from bs4 import BeautifulSoup
import json
import time
import re
from urllib.parse import quote

def get_shop_info(name, address):
    """
    使用 Google Maps 搜尋店家資訊
    """
    # 構建搜尋 URL，使用店家名稱和地址
    search_query = f"{name} {address}"
    encoded_query = quote(search_query)
    search_url = f"https://www.google.com/maps/search/{encoded_query}"
    
    # 設置請求頭
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
    }
    
    try:
        # 發送請求
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        
        # 解析頁面
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 提取電話號碼 - 使用更精確的模式
        phone_pattern = r'(?:電話|TEL|Tel|tel)[：:]\s*(\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})'
        phone_matches = re.findall(phone_pattern, response.text)
        
        # 提取社交媒體連結
        social_links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            if any(site in href.lower() for site in ['facebook.com', 'instagram.com', 'fb.com', 'ig.com']):
                social_links.append(href)
        
        # 提取營業時間
        hours_pattern = r'營業時間[：:]\s*([^\n]+)'
        hours_match = re.search(hours_pattern, response.text)
        hours = hours_match.group(1) if hours_match else None
        
        return {
            'phone': phone_matches[0] if phone_matches else None,
            'social_links': list(set(social_links))[:2],  # 去重並只取前兩個
            'hours': hours
        }
    
    except Exception as e:
        print(f"Error fetching info for {name}: {str(e)}")
        return None

# 店家資訊列表
shops = [
    {
        'name': '逃生入口 Bar',
        'address': '新北市永和區永貞路75號'
    },
    {
        'name': '酒窩海盜聯盟',
        'address': '新北市永和區得和路107號B1'
    },
    {
        'name': 'ViVi',
        'address': '新北市永和區永貞路177號'
    },
    {
        'name': 'Jack Bar',
        'address': '新北市永和區永亨路130號'
    },
    {
        'name': 'No.5',
        'address': '新北市永和區中正路555號'
    }
]

# 爬取每間店的資訊
results = {}
for shop in shops:
    print(f"正在爬取 {shop['name']} 的資訊...")
    info = get_shop_info(shop['name'], shop['address'])
    if info:
        results[shop['name']] = info
    time.sleep(3)  # 增加延遲時間，避免被封鎖

# 將結果保存到文件
with open('shop_contact_info.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("爬取完成，結果已保存到 shop_contact_info.json") 