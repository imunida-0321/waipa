export type Rng = () => number

export type CardKind = 'pair' | 'joker' | 'lucky'
export type CardState = 'hidden' | 'revealed' | 'removed'

export type Card = {
	id: string // 'p3-a' | 'p3-b' | 'joker' | 'lucky'
	kind: CardKind
	pairId: string | null // pair 以外は null
	symbol: string
	state: CardState
}

// ネオン映えする絵柄7種（#67 のトランプ風と差別化）
export const PAIR_SYMBOLS = ['🎤', '🎲', '🌶️', '💃', '🎯', '⚡', '🦄'] as const
export const PAIR_COUNT = 7
export const BOARD_SIZE = 16

export const JOKER_SYMBOL = '🃏'
export const LUCKY_SYMBOL = '🍀'

// Fisher–Yates。rng は [0,1) を返す想定
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const arr = [...items]
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

// 7ペア（14枚）＋ジョーカー1＋ラッキー1 = 16枚をシャッフルして返す
export function createDeck(rng: Rng): Card[] {
	const cards: Card[] = []
	PAIR_SYMBOLS.forEach((symbol, i) => {
		const pairId = `p${i + 1}`
		cards.push(
			{ id: `${pairId}-a`, kind: 'pair', pairId, symbol, state: 'hidden' },
			{ id: `${pairId}-b`, kind: 'pair', pairId, symbol, state: 'hidden' },
		)
	})
	cards.push({ id: 'joker', kind: 'joker', pairId: null, symbol: JOKER_SYMBOL, state: 'hidden' })
	cards.push({ id: 'lucky', kind: 'lucky', pairId: null, symbol: LUCKY_SYMBOL, state: 'hidden' })
	return shuffle(cards, rng)
}

export function isMatch(a: Card, b: Card): boolean {
	return a.kind === 'pair' && b.kind === 'pair' && a.pairId === b.pairId
}

export type PunishTarget = {
	firstIndex: number
	finalIndex: number
	passConsumed: boolean
}

// 全員から1人抽選。パス保持者が当選したら消費して本人を除き再抽選
export function pickPunishTarget(
	playerCount: number,
	passHolder: number | null,
	rng: Rng,
): PunishTarget {
	const firstIndex = Math.floor(rng() * playerCount)
	if (passHolder === null || firstIndex !== passHolder) {
		return { firstIndex, finalIndex: firstIndex, passConsumed: false }
	}
	// 保持者を除いた playerCount-1 枠から引き、保持者以降は index を +1 詰め替え
	const slot = Math.floor(rng() * (playerCount - 1))
	const finalIndex = slot >= passHolder ? slot + 1 : slot
	return { firstIndex, finalIndex, passConsumed: true }
}
