#!/usr/bin/env bash
# assets/images/cards/*.webp をパブリックドメイン素材から再生成する（macOS 専用）
# 素材: https://github.com/notpeter/Vector-Playing-Cards (public domain / WTFPL)
set -euo pipefail

command -v cwebp >/dev/null || { echo "cwebp がありません: brew install webp" >&2; exit 1; }
command -v qlmanage >/dev/null || { echo "qlmanage がありません（macOS 専用スクリプトです）" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/images/cards"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 https://github.com/notpeter/Vector-Playing-Cards.git "$TMP/repo"
mkdir -p "$TMP/png" "$OUT"

# SVG → 幅360px PNG（絵札SVGは1MB超のため実行時描画せず事前ラスタライズする）
qlmanage -t -s 360 -o "$TMP/png" "$TMP/repo/cards-svg/"*.svg >/dev/null

for f in "$TMP/png"/*.svg.png; do
	base="$(basename "$f" .svg.png)"
	[ "$base" = "Joker2" ] && continue # ジョーカーは Joker1 の1種のみ使う
	cwebp -quiet -q 85 "$f" -o "$OUT/$base.webp"
done

echo "generated: $(ls "$OUT"/*.webp | wc -l | tr -d ' ') webp files -> $OUT"
