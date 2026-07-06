#!/bin/bash
# PreToolUse hook: 秘密情報ファイル (.env* や鍵ファイル) への読み取りアクセスをブロックする。
# .env.example のみ許可。CLAUDE.md のセキュリティポリシーを強制する。

input=$(cat)

# 検査対象: file_path / command / pattern / path などツール入力全体
# .env.example への言及だけなら許可するため、まず example を除去してから判定する
sanitized=$(printf '%s' "$input" | sed 's/\.env\.example//g')

if printf '%s' "$sanitized" | grep -qE '\.env(\.[A-Za-z0-9_.-]+)?' ; then
  echo "BLOCKED: .env 系ファイルへのアクセスは CLAUDE.md のセキュリティポリシーで禁止されています。.env.example のみ閲覧可。" >&2
  exit 2
fi

if printf '%s' "$sanitized" | grep -qE '\.(p8|p12|jks|mobileprovision)\b|_rsa\b|\.pem\b' ; then
  echo "BLOCKED: 秘密鍵・署名証明書ファイルへのアクセスは禁止されています。" >&2
  exit 2
fi

exit 0
