#!/bin/bash
# 起動中の iOS シミュレータの画面を撮り、幅 1044px の JPEG で保存する。
# 使い方: capture.sh <保存先.jpg> [待ち秒数（既定 0.8）]
# 保存先はリポジトリの外にする（中に書くと Fast Refresh の帯が写り込むことがある）。
set -euo pipefail

if [ $# -lt 1 ]; then
	echo "使い方: $0 <保存先.jpg> [待ち秒数]" >&2
	exit 1
fi

out="$1"
mkdir -p "$(dirname "$out")"
sleep "${2:-0.8}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
xcrun simctl io booted screenshot "$tmp/shot.png" >/dev/null 2>&1
sips -Z 1044 -s format jpeg -s formatOptions 78 "$tmp/shot.png" --out "$out" >/dev/null
stat -f '%z bytes  %N' "$out"
