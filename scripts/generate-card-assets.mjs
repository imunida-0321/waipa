// src/games/nomige-suijaku/card-assets.ts を生成する。
// React Native の require は静的パス必須のため、52枚＋ジョーカーを列挙したマップを吐く
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUIT_LETTERS = ['S', 'H', 'D', 'C']

const lines = [
	'// このファイルは scripts/generate-card-assets.mjs による自動生成。手で編集しない',
	"import type { Suit } from './engine'",
	'',
	'const CARD_IMAGES: Record<string, number> = {',
]
for (const s of SUIT_LETTERS) {
	for (const r of RANKS) {
		lines.push(`\t'${r}${s}': require('@/assets/images/cards/${r}${s}.webp'),`)
	}
}
lines.push(
	'}',
	'',
	"const SUIT_LETTER: Record<Suit, string> = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' }",
	'',
	'export function cardImageSource(rank: string, suit: Suit): number {',
	'\treturn CARD_IMAGES[`${rank}${SUIT_LETTER[suit]}`]',
	'}',
	'',
	"export const JOKER_IMAGE: number = require('@/assets/images/cards/Joker1.webp')",
	'',
)

const out = join(
	dirname(fileURLToPath(import.meta.url)),
	'../src/games/nomige-suijaku/card-assets.ts',
)
writeFileSync(out, lines.join('\n'))
console.log(`generated: ${out}`)
