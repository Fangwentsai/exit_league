#!/usr/bin/env python3
"""一次性的 Google OAuth 授權：拿到可以寫入試算表的 token。

用的是 repo 根目錄的 credentials.json（OAuth desktop client），
走 loopback redirect：本機起一個小 server 接授權碼，換成 token 後
存進 .google_token.json（已加進 .gitignore，不會進版控）。

    python3 scripts/google_oauth.py          # 開始授權，印出授權網址
    python3 scripts/google_oauth.py --check  # 檢查現有 token 還能不能用
"""
import base64, hashlib, http.server, json, os, secrets, sys, threading, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRED = os.path.join(ROOT, 'credentials.json')
TOKEN = os.path.join(ROOT, '.google_token.json')
SCOPE = 'https://www.googleapis.com/auth/spreadsheets'


def conf():
    with open(CRED) as f:
        return json.load(f)['installed']


def post(url, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def save(tok):
    with open(TOKEN, 'w') as f:
        json.dump(tok, f, indent=2)
    os.chmod(TOKEN, 0o600)


def access_token():
    """回傳可用的 access token，過期就用 refresh_token 換新的。"""
    c = conf()
    with open(TOKEN) as f:
        tok = json.load(f)
    new = post(c['token_uri'], {
        'client_id': c['client_id'], 'client_secret': c['client_secret'],
        'refresh_token': tok['refresh_token'], 'grant_type': 'refresh_token',
    })
    tok.update(new)
    save(tok)
    return tok['access_token']


class Handler(http.server.BaseHTTPRequestHandler):
    code = None

    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        Handler.code = q.get('code', [None])[0]
        err = q.get('error', [None])[0]
        msg = '授權失敗：' + err if err else '授權完成，可以關掉這個分頁了。'
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(f'<meta charset="utf-8"><h2>{msg}</h2>'.encode())

    def log_message(self, *a):
        pass


def authorize():
    c = conf()
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(64)).decode().rstrip('=')
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')

    srv = http.server.HTTPServer(('127.0.0.1', 0), Handler)
    redirect = f'http://127.0.0.1:{srv.server_port}'
    url = c['auth_uri'] + '?' + urllib.parse.urlencode({
        'client_id': c['client_id'], 'redirect_uri': redirect,
        'response_type': 'code', 'scope': SCOPE,
        'access_type': 'offline', 'prompt': 'consent',
        'code_challenge': challenge, 'code_challenge_method': 'S256',
    })
    print('請用 fangwentsai14@gmail.com 開這個網址授權：\n')
    print(url + '\n')
    sys.stdout.flush()

    t = threading.Thread(target=srv.handle_request)
    t.start()
    t.join(timeout=300)
    srv.server_close()
    if not Handler.code:
        print('❌ 沒收到授權碼（逾時或被取消）')
        return 1

    tok = post(c['token_uri'], {
        'client_id': c['client_id'], 'client_secret': c['client_secret'],
        'code': Handler.code, 'code_verifier': verifier,
        'grant_type': 'authorization_code', 'redirect_uri': redirect,
    })
    if 'refresh_token' not in tok:
        print('❌ 回傳沒有 refresh_token，請移除舊授權後重試')
        return 1
    save(tok)
    print('✅ token 已存到 .google_token.json')
    return 0


if __name__ == '__main__':
    if '--check' in sys.argv:
        try:
            t = access_token()
            print('✅ token 可用，access token 長度', len(t))
        except Exception as e:
            print('❌', e)
            sys.exit(1)
    else:
        sys.exit(authorize())
