import {
	BOARD_SIZE,
	PAIR_COUNT,
	PAIR_SYMBOLS,
	createDeck,
	isMatch,
	pickPunishTarget,
	type Card,
} from '../engine'

// 固定順で値を返す rng（プールが尽きたら 0 を返す）
function seqRng(values: number[]) {
	let i = 0
	return () => values[i++] ?? 0
}

describe('createDeck', () => {
	it('16枚・7ペア×2・ジョーカー1・ラッキー1で構成される', async () => {
		const deck = createDeck(() => 0.5)
		expect(deck).toHaveLength(BOARD_SIZE)
		expect(deck.filter((c) => c.kind === 'pair')).toHaveLength(PAIR_COUNT * 2)
		expect(deck.filter((c) => c.kind === 'joker')).toHaveLength(1)
		expect(deck.filter((c) => c.kind === 'lucky')).toHaveLength(1)
	})

	it('各ペアはちょうど2枚ずつ・シンボルは PAIR_SYMBOLS から重複なし', async () => {
		const deck = createDeck(() => 0.5)
		const byPair = new Map<string, Card[]>()
		for (const c of deck) {
			if (c.kind !== 'pair') continue
			byPair.set(c.pairId as string, [...(byPair.get(c.pairId as string) ?? []), c])
		}
		expect(byPair.size).toBe(PAIR_COUNT)
		const symbols = new Set<string>()
		for (const cards of byPair.values()) {
			expect(cards).toHaveLength(2)
			expect(cards[0].symbol).toBe(cards[1].symbol)
			expect(PAIR_SYMBOLS).toContain(cards[0].symbol)
			symbols.add(cards[0].symbol)
		}
		expect(symbols.size).toBe(PAIR_COUNT)
	})

	it('全カードが hidden で始まり id は一意', async () => {
		const deck = createDeck(() => 0.5)
		expect(deck.every((c) => c.state === 'hidden')).toBe(true)
		expect(new Set(deck.map((c) => c.id)).size).toBe(BOARD_SIZE)
	})

	it('rng によって並び順が変わる（シャッフルされている）', async () => {
		const a = createDeck(seqRng([0.1, 0.9, 0.3, 0.7, 0.5]))
		const b = createDeck(seqRng([0.9, 0.1, 0.7, 0.3, 0.5]))
		expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id))
	})
})

describe('isMatch', () => {
	const pair = (pairId: string, suffix: string): Card => ({
		id: `${pairId}-${suffix}`,
		kind: 'pair',
		pairId,
		symbol: '🎲',
		state: 'revealed',
	})
	it('同じ pairId の2枚は成立', async () => {
		expect(isMatch(pair('p1', 'a'), pair('p1', 'b'))).toBe(true)
	})
	it('異なる pairId は不成立', async () => {
		expect(isMatch(pair('p1', 'a'), pair('p2', 'a'))).toBe(false)
	})
})

describe('pickPunishTarget', () => {
	it('パス保持者なし: rng の値に応じた index が first=final になる', async () => {
		const r = pickPunishTarget(4, null, () => 0.5) // floor(0.5*4)=2
		expect(r).toEqual({ firstIndex: 2, finalIndex: 2, passConsumed: false })
	})

	it('パス保持者が当選したら消費して本人を除いて再抽選', async () => {
		// 1回目: floor(0.25*4)=1（パス保持者）→ 再抽選: floor(0.5*3)=1 → 保持者(1)を飛ばして 2
		const r = pickPunishTarget(4, 1, seqRng([0.25, 0.5]))
		expect(r.firstIndex).toBe(1)
		expect(r.passConsumed).toBe(true)
		expect(r.finalIndex).toBe(2)
		expect(r.finalIndex).not.toBe(1)
	})

	it('パス保持者が当選しなければ消費しない', async () => {
		const r = pickPunishTarget(4, 1, () => 0.9) // floor(0.9*4)=3
		expect(r).toEqual({ firstIndex: 3, finalIndex: 3, passConsumed: false })
	})

	it('2人プレイでパス保持者が当選したらもう1人に確定', async () => {
		const r = pickPunishTarget(2, 0, seqRng([0.1, 0.99])) // first=0 → 再抽選は必ず 1
		expect(r).toEqual({ firstIndex: 0, finalIndex: 1, passConsumed: true })
	})
})
