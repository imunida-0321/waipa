#!/bin/bash
# PreToolUse hook: gh pr create の前に、Notion の基本設計書の確認を求める。
# PR の差分に画面・ゲーム・構成に関わるファイルが含まれるのに、PR の説明に「Notion」の文字が無ければ止める。
# 直し方は .claude/skills/notion-design-docs/SKILL.md、決まりは CLAUDE.md と docs/DESIGN.md にある。

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

# gh pr create 以外は対象外
printf '%s' "$cmd" | grep -qE '(^|[^[:alnum:]_-])gh[[:space:]]+pr[[:space:]]+create([[:space:]]|$)' || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# PR の説明（コマンドに直接書いたもの、または --body-file）に Notion の記載があれば通す
printf '%s' "$cmd" | grep -q 'Notion' && exit 0
body_file=$(printf '%s' "$cmd" | grep -oE -- '(--body-file|-F)[= ]+[^[:space:]]+' | head -1 | sed -E 's/^(--body-file|-F)[= ]+//' | tr -d "'\"")
if [ -n "$body_file" ] && [ -f "$body_file" ] && grep -q 'Notion' "$body_file"; then
	exit 0
fi

# 比べる先のブランチ（--base / -B、無ければ develop）
base=$(printf '%s' "$cmd" | grep -oE -- '(--base|-B)[= ]+[^[:space:]]+' | head -1 | sed -E 's/^(--base|-B)[= ]+//' | tr -d "'\"")
base=${base:-develop}
if git rev-parse --verify -q "origin/$base" >/dev/null; then
	ref="origin/$base"
elif git rev-parse --verify -q "$base" >/dev/null; then
	ref="$base"
else
	exit 0
fi

relevant=$(git diff --name-only "$ref"...HEAD 2>/dev/null |
	grep -E '^(src/(app|components|games|lib|constants|theme)/|app\.json$|package\.json$)' |
	grep -vE '(/__tests__/|\.test\.[jt]sx?$)')
[ -z "$relevant" ] && exit 0

count=$(printf '%s\n' "$relevant" | wc -l | tr -d ' ')
{
	echo "BLOCKED: 画面・ゲーム・構成に関わるファイルが ${count} 件変わっていますが、PR の説明に Notion の記載がありません。"
	echo "notion-design-docs スキルで、Notion の基本設計書（全体構成・画面設計書）を直す必要があるか確かめてください。"
	echo "そのうえで PR の説明に「## Notion」の節（直したページのリンク、または更新不要の理由）を書き、もう一度 PR を作ってください。"
	echo "対象のファイル:"
	printf '%s\n' "$relevant" | head -20 | sed 's/^/  /'
	[ "$count" -gt 20 ] && echo "  ほか $((count - 20)) 件"
} >&2
exit 2
