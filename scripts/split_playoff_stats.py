#!/usr/bin/env python3
"""把 personal 凍結在例行賽，並建立 personal_playoff 分頁。

分界：data!A1:H1273 是例行賽 G01~G60，A1274 以後是季後賽 G61 起。
改成有界的範圍之後，例行賽那邊不會再被新比賽影響，
季後賽那邊則會隨著新區塊自動累加，兩邊都不用再手動維護。

    python3 scripts/split_playoff_stats.py --dry-run   # 只印出要寫什麼
    python3 scripts/split_playoff_stats.py             # 實際寫入
"""
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from sheets_api import read, write, meta, batch_update

LAST = 187          # personal 最後一位選手所在列
CUT = 1273          # 例行賽在 data 分頁的最後一列


def formulas(row, a, c, e, b, d, h, faa):
    """C~M 共 11 欄。faa 是先攻率，兩個分頁的條件不同。"""
    return [
        f'=sumif({a},$B{row},{c})',          # C 01勝場
        f'=iferror(C{row}/J{row},0)',        # D 01勝率
        f'=sumif({a},$B{row},{e})',          # E CR勝場
        f'=iferror(E{row}/K{row},0)',        # F CR勝率
        f'=C{row}+E{row}',                   # G 總勝場
        f'=iferror(G{row}/M{row},0)',        # H 總勝率
        faa,                                 # I 先攻率
        f'=sumif({a},$B{row},{b})',          # J 01場次
        f'=sumif({a},$B{row},{d})',          # K CR場次
        f'=sumif({a},$B{row},{h})',          # L 先攻數
        f'=sum(J{row}:K{row})',              # M 總場數
    ]


def season_rows():
    rng = lambda col: f'data!${col}$1:${col}${CUT}'
    return [formulas(r, rng('A'), rng('C'), rng('E'), rng('B'), rng('D'), rng('H'),
                     # 例行賽沿用原本的門檻：出賽未滿 10 局顯示 DNP
                     f'=iferror(if(M{r}<10,"DNP",sum(L{r}/M{r})),0)')
            for r in range(2, LAST + 1)]


def playoff_rows():
    rng = lambda col: f'data!${col}${CUT + 1}:${col}'
    return [formulas(r, rng('A'), rng('C'), rng('E'), rng('B'), rng('D'), rng('H'),
                     # 季後賽單場上限 8 局，掛 DNP 門檻會整欄看不到東西
                     f'=iferror(L{r}/M{r},0)')
            for r in range(2, LAST + 1)]


def ensure_playoff_sheet():
    for s in meta()['sheets']:
        if s['properties']['title'] == 'personal_playoff':
            print('  personal_playoff 已存在，沿用')
            return s['properties']['sheetId']
    src = next(s['properties']['sheetId'] for s in meta()['sheets']
               if s['properties']['title'] == 'personal')
    out = batch_update([{'duplicateSheet': {
        'sourceSheetId': src, 'newSheetName': 'personal_playoff'}}])
    sid = out['replies'][0]['duplicateSheet']['properties']['sheetId']
    print('  已複製 personal → personal_playoff')
    return sid


def main():
    dry = '--dry-run' in sys.argv
    s, p = season_rows(), playoff_rows()
    print(f'personal       C2:M{LAST}　例行賽（data 1~{CUT}）')
    print('  第2列：', s[0][0], '|', s[0][6])
    print(f'personal_playoff C2:M{LAST}　季後賽（data {CUT + 1} 起）')
    print('  第2列：', p[0][0], '|', p[0][6])
    if dry:
        print('\n--dry-run，沒有寫入')
        return
    print('\n寫入中…')
    write(f'personal!C2:M{LAST}', s)
    ensure_playoff_sheet()
    write(f'personal_playoff!C2:M{LAST}', p)
    print('\n完成。')


if __name__ == '__main__':
    main()
