#!/usr/bin/env python3
"""把新的賽程列追加到 schedule 分頁。

只會寫在目前最後一列的後面，不覆蓋既有資料；執行前會先印出要寫什麼，
並檢查目標範圍確實是空的，避免算錯列號蓋掉賽果。

    python3 scripts/add_schedule_rows.py --dry-run
    python3 scripts/add_schedule_rows.py
"""
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from sheets_api import read, write

# 遊戲編號, 日期, 客場, 客場分數, vs, 主場分數, 主場, 比賽地點
ROWS = [
    ['G70', '11/17', '軟飯揪團中', '', 'vs', '', '逃生Zoo口', '逃生入口Bar'],
    ['G71', '11/17', '有點傻',     '', 'vs', '', '哈哈隊',    'Vivi Bar'],
]


def main():
    existing = read('schedule!A1:H200')
    start = len(existing) + 1
    end = start + len(ROWS) - 1
    rng = f'schedule!A{start}:H{end}'

    print(f'目前最後一列：{len(existing)}（{existing[-1][0]}）')
    print(f'要寫入 {rng}：')
    for r in ROWS:
        print('  ', r)

    after = read(f'schedule!A{start}:H{end}')
    if any(any(str(c).strip() for c in row) for row in after):
        raise SystemExit(f'❌ {rng} 不是空的，停手')
    print('目標範圍確認為空 ✅')

    if '--dry-run' in sys.argv:
        print('\n--dry-run，沒有寫入')
        return
    write(rng, ROWS)
    print('\n寫入後：')
    for i, r in enumerate(read(f'schedule!A{start - 1}:H{end}'), start - 1):
        print(' ', i, r)


if __name__ == '__main__':
    main()
