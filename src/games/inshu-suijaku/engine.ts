import { NORMAL_PUNISHMENTS, SPECIAL_PUNISHMENTS } from './punishments'

export type Rng = () => number

export type BoardSize = 'small' | 'medium' | 'large'

export type Suit = '♠' | '♥' | '♦' | '♣'

export type CardState = 'hidden' | 'revealed' | 'removed'

export type Card = {
	id: string // 'p3-a' | 'p3-b' | 'joker-1'
	pairId: string | null // ジョーカーは null
	rank: string // 'A'..'K' | 'JOKER'
	suit: Suit | null // ジョーカーは null
	punishmentId: string
	punishment: string // ペア成立（またはジョーカー発動）まで UI に出さない
	state: CardState
}

export const JOKER_COUNT = 2

// columns はグリッドの列数（小・中は4列、大は5列）
export const BOARD_CONFIG = {
	small: { columns: 4, pairs: 7, label: '小 4×4', estimate: '約10分' },
	medium: { columns: 4, pairs: 9, label: '中 4×5', estimate: '約15分' },
	large: { columns: 5, pairs: 14, label: '大 5×6', estimate: '約20分' },
} as const satisfies Record<
	BoardSize,
	{ columns: number; pairs: number; label: string; estimate: string }
>

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const SUITS = ['♠', '♥', '♦', '♣'] as const

// Fisher–Yates。rng は [0,1) を返す想定
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const arr = [...items]
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

// 標準52枚からペア数ぶんの (rank, suit) を重複なし抽出し、罰を割り当ててシャッフルする
export function createDeck(size: BoardSize, rng: Rng): Card[] {
	const { pairs } = BOARD_CONFIG[size]
	const combos = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })))
	const picked = shuffle(combos, rng).slice(0, pairs)
	const normals = shuffle(NORMAL_PUNISHMENTS, rng).slice(0, pairs)
	const specials = shuffle(SPECIAL_PUNISHMENTS, rng).slice(0, JOKER_COUNT)

	const cards: Card[] = []
	picked.forEach((combo, i) => {
		const pairId = `p${i + 1}`
		const pun = normals[i]
		const base = {
			pairId,
			rank: combo.rank,
			suit: combo.suit,
			punishmentId: pun.id,
			punishment: pun.text,
			state: 'hidden' as const,
		}
		cards.push({ id: `${pairId}-a`, ...base }, { id: `${pairId}-b`, ...base })
	})
	specials.forEach((pun, i) => {
		cards.push({
			id: `joker-${i + 1}`,
			pairId: null,
			rank: 'JOKER',
			suit: null,
			punishmentId: pun.id,
			punishment: pun.text,
			state: 'hidden',
		})
	})
	return shuffle(cards, rng)
}

export function isMatch(a: Card, b: Card): boolean {
	return a.pairId !== null && a.pairId === b.pairId
}

// 未消化（removed でない）ペアの残り数
export function remainingPairs(cards: Card[]): number {
	const alive = new Set(
		cards.filter((c) => c.pairId !== null && c.state !== 'removed').map((c) => c.pairId),
	)
	return alive.size
}
