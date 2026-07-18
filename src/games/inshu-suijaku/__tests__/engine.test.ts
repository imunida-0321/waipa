import {
	BOARD_CONFIG,
	createDeck,
	isMatch,
	JOKER_COUNT,
	remainingPairs,
	type BoardSize,
	type Card,
} from '../engine'

// 決定的な疑似乱数（mulberry32）
function mulberry32(seed: number): () => number {
	let s = seed >>> 0
	return () => {
		s = (s + 0x6d2b79f5) >>> 0
		let t = s
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const sizes: BoardSize[] = ['small', 'medium', 'large']

describe.each(sizes)('createDeck(%s)', (size) => {
	const rng = mulberry32(42)
	const deck = createDeck(size, rng)
	const { pairs } = BOARD_CONFIG[size]

	it('枚数 = ペア数×2 + ジョーカー2', () => {
		expect(deck).toHaveLength(pairs * 2 + JOKER_COUNT)
	})

	it('ジョーカーは2枚で pairId は null', () => {
		const jokers = deck.filter((c) => c.rank === 'JOKER')
		expect(jokers).toHaveLength(2)
		jokers.forEach((j) => {
			expect(j.pairId).toBeNull()
			expect(j.suit).toBeNull()
			expect(j.punishmentId).toMatch(/^s\d{2}$/)
		})
	})

	it('各ペアは同ランク・同スート・同罰テキストの2枚組', () => {
		const byPair = new Map<string, Card[]>()
		deck.filter((c) => c.pairId).forEach((c) => {
			byPair.set(c.pairId as string, [...(byPair.get(c.pairId as string) ?? []), c])
		})
		expect(byPair.size).toBe(pairs)
		byPair.forEach((cards) => {
			expect(cards).toHaveLength(2)
			expect(cards[0].rank).toBe(cards[1].rank)
			expect(cards[0].suit).toBe(cards[1].suit)
			expect(cards[0].punishment).toBe(cards[1].punishment)
			expect(cards[0].punishmentId).toMatch(/^n\d{2}$/)
		})
	})

	it('ランク＋スートの組はペア間で重複しない', () => {
		const combos = [...new Set(deck.filter((c) => c.pairId).map((c) => `${c.rank}${c.suit}`))]
		expect(combos).toHaveLength(pairs)
	})

	it('罰はペア間・ジョーカー間で重複しない', () => {
		const ids = deck.map((c) => c.punishmentId)
		expect(new Set(ids).size).toBe(pairs + JOKER_COUNT)
	})

	it('全カード hidden で始まる', () => {
		deck.forEach((c) => expect(c.state).toBe('hidden'))
	})
})

it('isMatch: 同 pairId のみ true（ジョーカー同士は false）', () => {
	const rng = mulberry32(1)
	const deck = createDeck('small', rng)
	const pair = deck.filter((c) => c.pairId === deck.find((d) => d.pairId)?.pairId)
	expect(isMatch(pair[0], pair[1])).toBe(true)
	const jokers = deck.filter((c) => c.rank === 'JOKER')
	expect(isMatch(jokers[0], jokers[1])).toBe(false)
	expect(isMatch(pair[0], jokers[0])).toBe(false)
})

it('remainingPairs: removed を除いたペア数を返す', () => {
	const deck = createDeck('small', mulberry32(2))
	expect(remainingPairs(deck)).toBe(7)
	const firstPairId = deck.find((c) => c.pairId)?.pairId
	const removed = deck.map((c) =>
		c.pairId === firstPairId ? { ...c, state: 'removed' as const } : c,
	)
	expect(remainingPairs(removed)).toBe(6)
})

describe('createDeck カスタムお題', () => {
	const fixedRng = () => 0.5
	const custom = {
		normals: [
			{ id: 'c1', text: 'カスタム通常1', type: 'normal' as const },
			{ id: 'c2', text: 'カスタム通常2', type: 'normal' as const },
		],
		specials: [{ id: 'c3', text: 'カスタム特大', type: 'special' as const }],
	}

	it('カスタム通常罰が優先して盤面に入る', () => {
		const cards = createDeck('small', fixedRng, custom)
		const ids = new Set(cards.map((c) => c.punishmentId))
		expect(ids.has('c1')).toBe(true)
		expect(ids.has('c2')).toBe(true)
	})

	it('カスタム特大罰がジョーカーに優先して割り当たる', () => {
		const cards = createDeck('small', fixedRng, custom)
		const jokers = cards.filter((c) => c.rank === 'JOKER')
		expect(jokers.some((c) => c.punishmentId === 'c3')).toBe(true)
		expect(jokers).toHaveLength(JOKER_COUNT)
	})

	it('カスタムがペア数を超えてもペア数・カード枚数は変わらない', () => {
		const many = {
			normals: Array.from({ length: 30 }, (_, i) => ({
				id: `cn${i}`,
				text: `多め${i}`,
				type: 'normal' as const,
			})),
			specials: [],
		}
		const cards = createDeck('small', fixedRng, many)
		expect(cards).toHaveLength(BOARD_CONFIG.small.pairs * 2 + JOKER_COUNT)
	})

	it('custom 省略時は従来どおりプリセットのみ', () => {
		const cards = createDeck('small', fixedRng)
		expect(cards.every((c) => !c.punishmentId.startsWith('c'))).toBe(true)
	})
})
