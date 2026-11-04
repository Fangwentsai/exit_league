#!/usr/bin/env python3
"""用 .google_token.json 讀寫試算表的小工具層。

只有這一層碰 Google API，其他腳本 import 它。
會印出每一次寫入動作，方便對照實際改了什麼。
"""
import json, sys, urllib.parse, urllib.request
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from google_oauth import access_token

SHEET_ID = '1APUuzy6Dcbi1sWGUVvrbrluEvKsktRvPYygASofekKQ'
BASE = 'https://sheets.googleapis.com/v4/spreadsheets/'


def _req(url, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header('Authorization', 'Bearer ' + access_token())
    if data:
        r.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(r) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'HTTP {e.code}: {e.read().decode()[:500]}')


def meta(sheet_id=SHEET_ID):
    return _req(BASE + sheet_id + '?fields=sheets.properties(sheetId,title,gridProperties)')


def read(rng, formulas=False, sheet_id=SHEET_ID):
    q = urllib.parse.urlencode(
        {'valueRenderOption': 'FORMULA'} if formulas else {})
    url = f'{BASE}{sheet_id}/values/{urllib.parse.quote(rng)}?{q}'
    return _req(url).get('values', [])


def write(rng, values, sheet_id=SHEET_ID):
    url = (f'{BASE}{sheet_id}/values/{urllib.parse.quote(rng)}'
           '?valueInputOption=USER_ENTERED')
    out = _req(url, 'PUT', {'values': values})
    print(f'  寫入 {rng}：{out.get("updatedCells")} 格')
    return out


def batch_update(requests, sheet_id=SHEET_ID):
    return _req(f'{BASE}{sheet_id}:batchUpdate', 'POST', {'requests': requests})


if __name__ == '__main__':
    for s in meta()['sheets']:
        p = s['properties']
        print(p['sheetId'], p['title'], p['gridProperties'])
