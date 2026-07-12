#!/usr/bin/env bash
# assets/images/cards/*.webp をパブリックドメイン素材から再生成する（macOS 専用）
# 素材: https://github.com/notpeter/Vector-Playing-Cards (public domain / WTFPL)
set -euo pipefail

command -v cwebp >/dev/null || { echo "cwebp がありません: brew install webp" >&2; exit 1; }
command -v qlmanage >/dev/null || { echo "qlmanage がありません（macOS 専用スクリプトです）" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 がありません" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/images/cards"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# qlmanage のレンダリング解像度（正方形・後述の理由で高めに取る）
RENDER_SIZE=1046

git clone --depth 1 https://github.com/notpeter/Vector-Playing-Cards.git "$TMP/repo"
mkdir -p "$TMP/svg" "$TMP/png" "$TMP/cropped" "$OUT"

# --- 背景 ---
# 素材の各 SVG は width/height を viewBox と同じ縦長比率（167.0869141 : 242.6669922 ≈ 0.6886）で
# 宣言しているが、qlmanage -t -s N は「SVG が宣言する width/height の比率」でいったんレンダリングし、
# それを N×N の正方形キャンバスへ cover 方式（はみ出しをクロップ）で合わせ込む。
# 縦長のまま渡すと右端・下端がクロップされ、右枠線や右下のランク表記が欠落する。
# 対策: SVG の width/height を N×N の正方形に書き換えてから渡すと、qlmanage 内部の
# SVG→正方形ビューポートのスケーリングが標準の meet(contain) になり、正方形キャンバスの
# 中央にフルコンテンツがレターボックス（白余白）付きで描画される（クロップされない）。
# そのあと viewBox の比率から余白幅を厳密に計算し、sips で中央クロップして正しいアスペクト比の
# 画像に戻す。

# --- 1) SVG の width/height を正方形(RENDER_SIZE)に書き換え、viewBox 比率を記録する ---
# width/height/viewBox の宣言パターンを事前確認: 全54ファイルで
#   width="167.0869141pt" height="242.6669922pt" viewBox="0 0 167.0869141 242.6669922"
# に統一されている（`grep -h '<svg' cards-svg/*.svg | sed 's/>.*//' | sort -u` で確認済み、
# 一意）。念のため正規表現でファイルごとに viewBox を検出する堅牢な実装にしておく。
python3 - "$TMP/repo/cards-svg" "$TMP/svg" "$RENDER_SIZE" "$TMP/viewbox.tsv" <<'PY'
import re
import sys
import pathlib

src_dir, dst_dir, size, map_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
src_dir, dst_dir = pathlib.Path(src_dir), pathlib.Path(dst_dir)

viewbox_re = re.compile(r'viewBox="0 0 ([0-9.]+) ([0-9.]+)"')

svgs = sorted(src_dir.glob("*.svg"))
if not svgs:
	raise SystemExit(f"SVG が見つかりません: {src_dir}")

with open(map_path, "w", encoding="utf-8") as map_file:
	for svg in svgs:
		text = svg.read_text(encoding="utf-8")

		m = viewbox_re.search(text)
		if not m:
			raise SystemExit(f"viewBox を検出できませんでした: {svg}")
		vb_w, vb_h = float(m.group(1)), float(m.group(2))
		map_file.write(f"{svg.stem}\t{vb_w}\t{vb_h}\n")

		# <svg ...> 開始タグの範囲だけを対象に width/height を書き換える
		tag_start = text.index("<svg")
		tag_end = text.index(">", tag_start) + 1
		head, rest = text[:tag_end], text[tag_end:]

		new_head, n_w = re.subn(r'width="[^"]*"', f'width="{size}"', head, count=1)
		new_head, n_h = re.subn(r'height="[^"]*"', f'height="{size}"', new_head, count=1)
		if n_w != 1 or n_h != 1:
			raise SystemExit(f"width/height 属性を検出できませんでした: {svg}")

		(dst_dir / svg.name).write_text(new_head + rest, encoding="utf-8")

print(f"rewrote {len(svgs)} svg files -> {dst_dir}")
PY

# --- 2) SVG(正方形) → 正方形 PNG（高解像度でレンダリング） ---
qlmanage -t -s "$RENDER_SIZE" -o "$TMP/png" "$TMP/svg/"*.svg >/dev/null

# --- 3) 正方形 PNG を viewBox 比率で中央クロップし、正しいアスペクト比に戻す ---
while IFS=$'\t' read -r base vb_w vb_h; do
	f="$TMP/png/$base.svg.png"
	[ -f "$f" ] || { echo "PNG が見つかりません: $f" >&2; exit 1; }
	content_w="$(python3 -c "print(round($RENDER_SIZE * $vb_w / $vb_h))")"
	sips -c "$RENDER_SIZE" "$content_w" "$f" --out "$TMP/cropped/$base.png" >/dev/null
done < "$TMP/viewbox.tsv"

# --- 4) 正しいアスペクト比の PNG → 幅360px WebP ---
# cwebp 側で -resize 360 0（幅360px・アスペクト維持）にすることで、高解像度レンダリングからの
# ダウンサンプリングによりシャープさを保つ。
for f in "$TMP/cropped"/*.png; do
	base="$(basename "$f" .png)"
	[ "$base" = "Joker2" ] && continue # ジョーカーは Joker1 の1種のみ使う
	cwebp -quiet -q 85 "$f" -resize 360 0 -o "$OUT/$base.webp"
done

echo "generated: $(ls "$OUT"/*.webp | wc -l | tr -d ' ') webp files -> $OUT"
