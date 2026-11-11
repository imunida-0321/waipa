"""notion-create-file-upload で取った送信の枠へ、ローカルの画像を送る。

標準入力から1行に1枚ずつ読む:

    <画像のパス> <file_upload_id> <expires_at> <トークン>

トークンは authorization ヘッダーの値から "Bearer " を除いたもの。
トークンは「base64 の中身.署名」の形で、中身はアップロード ID・期限・ワークスペースの情報から決まる。
そのため、1行目に完全なトークンを渡せば、2行目以降は「.」より後ろの署名だけで送れる。
ワークスペースの情報はスクリプトに書かず、渡されたトークンから読み取る（リポジトリが公開のため）。

成功した行ごとに「<画像のパス> file-upload://<ID>」を出力する。失敗した行は「NG」で始まる。
"""

import base64
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SEND_URL = 'https://api.notion.com/v1/mcp/file_uploads/{}/send'


def decode_payload(token):
    body = token.split('.', 1)[0]
    body += '=' * (-len(body) % 4)
    return json.loads(base64.b64decode(body))


def expires_ms(expires_iso):
    dt = datetime.strptime(expires_iso, '%Y-%m-%dT%H:%M:%S.%fZ').replace(tzinfo=timezone.utc)
    return int(dt.timestamp()) * 1000 + dt.microsecond // 1000


def build_token(template, file_id, expires_iso, signature):
    # キーの順番も署名の対象なので、受け取ったトークンと同じ順番で組み立てる
    payload = dict(template)
    payload['fileUploadId'] = file_id
    payload['expiresAt'] = expires_ms(expires_iso)
    body = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    return base64.b64encode(body.encode()).decode().rstrip('=') + '.' + signature


def send(path, file_id, token):
    mime = 'image/png' if path.suffix.lower() == '.png' else 'image/jpeg'
    res = subprocess.run(
        [
            'curl', '-sS', '-X', 'POST', SEND_URL.format(file_id),
            '-H', f'authorization: Bearer {token}',
            '-F', f'file=@{path};filename={path.name};type={mime}',
        ],
        capture_output=True, text=True,
    )
    try:
        body = json.loads(res.stdout)
    except json.JSONDecodeError:
        body = {}
    return body, (res.stdout + res.stderr).strip()


def main():
    template = None
    ok = ng = 0
    for lineno, line in enumerate(sys.stdin, 1):
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        # authorization の値をそのまま貼っても読めるよう、Bearer を取り除く
        line = line.replace('Bearer ', '')
        # パスに空白が入っていても読めるよう、後ろの3列から切り出す
        parts = line.strip().rsplit(None, 3)
        if len(parts) != 4:
            # 行にはトークンが含まれるので、中身は表示しない
            print(f'NG {lineno} 行目: 列が {len(parts)} 個しかありません（パス、ID、期限、トークンの4列が必要）')
            ng += 1
            continue
        path, file_id, expires_iso, token = Path(parts[0]), parts[1], parts[2], parts[3]
        if not path.is_file():
            print(f'NG {path}: ファイルがありません')
            ng += 1
            continue
        if '.' in token:
            try:
                template = decode_payload(token)
            except Exception:
                # トークンの中身は表示しない
                print(f'NG {lineno} 行目: トークンを読み取れません。authorization の値をそのまま渡してください')
                ng += 1
                continue
        elif template is None:
            print(f'NG {path}: 署名だけでは送れません。1行目には完全なトークンを渡してください')
            ng += 1
            continue
        else:
            token = build_token(template, file_id, expires_iso, token)
        body, raw = send(path, file_id, token)
        if body.get('status') == 'uploaded':
            print(f'{path} {body.get("markdown_source", "file-upload://" + file_id)}')
            ok += 1
        else:
            print(f'NG {path}: {raw[:300]}')
            ng += 1
    print(f'送信 {ok} 件 / 失敗 {ng} 件', file=sys.stderr)
    sys.exit(1 if ng else 0)


main()
